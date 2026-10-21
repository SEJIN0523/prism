import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateMarket,adaptMarket,getMarket,analysisFor,selectStocks,CODE} from '../services/market.js';
import {defaults} from '../config/app.js';
import {calculate} from '../services/portfolio.js';
import {backup,restore} from '../services/storage.js';
const raw = await readFile(new URL('../data/prism-market.json',import.meta.url));
const data = JSON.parse(raw);
test('공개 JSON 원본 해시·종목 수·모집단·순위·신호 대사',()=>{
 assert.equal(createHash('sha256').update(raw).digest('hex'),'f171f77bceeb6e16c9e948c2d51bbe1c8269415b3ba5c48bf1457b213e5eef9f');
 assert.equal(validateMarket(data).stocks.length,2924);
 assert.equal(selectStocks(data.stocks).length,2762);
 assert.equal(selectStocks(data.stocks,{scope:'withheld'}).length,714);
 assert.equal(selectStocks(data.stocks,{scope:'historical'}).length,162);
 assert.equal(data.stocks.filter(s=>s.rank===null && s.listingStatus==='observed_on_asOf').length,552);
 assert.equal(data.stocks.filter(s=>s.rank!==null).length,2210);
 assert.equal(data.stocks.filter(s=>s.scores.comprehensive!==null).length,6);
});
test('기술 점수 정렬·종합점수 결측 후순위·영숫자 검색·보류 사유',()=>{
 assert.equal(selectStocks(data.stocks)[0].rank,1);
 assert.notEqual(selectStocks(data.stocks,{sort:'comprehensive'})[0].scores.comprehensive,null);
 for(const s of data.stocks.filter(s=>/[A-Z]/.test(s.code))) {
  assert(CODE.test(s.code)); assert.equal(selectStocks(data.stocks,{scope:'all',search:s.code.toLowerCase()})[0].code,s.code);
 }
 assert(data.stocks.filter(s=>s.rank===null).every(s=>s.risks.length>0));
});
for(const [name,mutate] of [
 ['components',d=>d.stocks[0].scores.components=null],['risk',d=>d.risk.cashTargetFraction=2],
 ['quality',d=>d.stocks[0].quality.coverage=NaN],['trend',d=>d.stocks[0].trend=[{code:'x',value:'true'}]],
 ['duplicate',d=>d.stocks.push(d.stocks[0])],['rank',d=>d.stocks.find(s=>s.rank===1).rank=2],
 ['score',d=>d.stocks[0].score=NaN],['future_price',d=>d.stocks[0].priceDate='2026-10-21'],
 ['future_financial',d=>d.stocks[0].quality.financialAvailableFrom='2026-10-21'],
 ['counts',d=>d.quality.coverage.analyzed++],['signal',d=>d.signals.pop()],
 ['signal_checks',d=>d.signals[0].checks={}],['private',d=>d.quality.personalAccountIncluded=true],
 ['validated_claim',d=>d.risk.profitabilityValidated=true],['conditions',d=>d.stocks[0].conditions=[]]
]) test(`손상 입력 차단: ${name}`,()=>{const d=structuredClone(data);mutate(d);assert.throws(()=>validateMarket(d));});
test('동일 입력/시각 재실행 일치 · stale를 최신으로 승격하지 않음',()=>{
 const now=new Date('2026-10-22T00:00:00Z');
 assert.deepEqual(adaptMarket(data,now),adaptMarket(data,now));
 assert.equal(adaptMarket(data,new Date('2026-10-20T00:00:00Z')).status,'stale');
});
test('HTTP·JSON·스키마·네트워크 실패 시 기존 분석을 최신으로 재사용하지 않음',async()=>{
 let options;
 const loaded=await getMarket({fetcher:async(url,o)=>{options=o;assert(url.pathname.endsWith('/data/prism-market.json'));return {ok:true,json:async()=>data};}});
 assert.equal(loaded.status,'stale');assert.equal(options.cache,'no-store');
 assert.equal(analysisFor('079650').rank,1);
 for(const fetcher of [async()=>({ok:false,status:404}),async()=>({ok:true,json:async()=>{throw Error('malformed')}}),async()=>({ok:true,json:async()=>({})}),async()=>{throw Error('offline')}]) {
  const d=await getMarket({fetcher});assert.equal(d.status,'error');assert.equal(d.asOf,null);assert.equal(d.signals.length,0);assert.equal(analysisFor('079650'),null);
 }
});
test('영숫자 장부·현금·수량·평가·관심종목·백업 왕복, 기존 키 유지',()=>{
 const code=data.stocks.find(s=>/[A-Z]/.test(s.code)).code;
 const s=defaults();s.initialCash=10000;s.watchlist=[code];s.transactions=[{id:'a',date:'2026-10-20',type:'buy',code,price:100,quantity:10},{id:'b',date:'2026-10-21',type:'sell',code,price:120,quantity:4}];s.quotes[code]={date:'2026-10-20',price:110};
 const p=calculate(s.initialCash,s.transactions,s.quotes);
 assert.equal(p.cash,9480);assert.equal(p.positions[0].quantity,6);assert.equal(p.assets,10140);assert.deepEqual(restore(backup(s)),s);
});
