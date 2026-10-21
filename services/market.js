import { catalog } from "../data/catalog.js";
export const CODE = /^[0-9A-Z]{6}$/;
const date = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
const score = n => n === null || (Number.isFinite(n) && n >= 0 && n <= 100);
const require = (ok, why) => { if (!ok) throw Error(`분석 데이터 검증 실패: ${why}`); };
// JSON Schema is checked at release; semantic checks also run on the device.
export function validateMarket(d) {
  require(d?.schemaVersion === 'prism.market.v1', 'schemaVersion');
  require(['stale','partial'].includes(d.status) && date(d.asOf), '상태/기준일');
  require(Array.isArray(d.stocks) && d.stocks.length > 0 && Array.isArray(d.signals) && Array.isArray(d.sectors), '목록');
  require(d.quality?.publicDataOnly === true && d.quality.personalAccountIncluded === false && d.quality.rawResponsesIncluded === false, '공개 데이터');
  require(d.risk?.profitabilityValidated === false, '미검증 표시');
  const codes = new Map(), ranked = [];
  for (const s of d.stocks) {
    require(typeof s.code === 'string' && CODE.test(s.code) && !codes.has(s.code), '중복/잘못된 코드');
    require(typeof s.name === 'string' && typeof s.sector === 'string' && s.asOf === d.asOf, '종목명/기준일');
    require(['observed_on_asOf','historical_only_not_legal_status'].includes(s.listingStatus), '모집단 상태');
    require(s.price === null || (Number.isFinite(s.price) && s.price >= 0), '가격');
    require(s.priceDate === null || (date(s.priceDate) && s.priceDate <= d.asOf), '가격 날짜');
    require(s.scoreBasis === 'comparableTechnical' && score(s.score) && s.scores?.comparableTechnical === s.score && score(s.scores.comprehensive), '점수');
    require(s.scores.components && typeof s.scores.components === 'object' && !Array.isArray(s.scores.components) && Object.values(s.scores.components).every(score), '구성 점수');
    require(s.rank === null ? s.score === null : Number.isInteger(s.rank) && s.rank > 0 && s.score !== null && s.listingStatus === 'observed_on_asOf', '순위');
    require(Array.isArray(s.trend) && Array.isArray(s.support) && Array.isArray(s.risks) && Array.isArray(s.quality?.missing), '근거/품질');
    require(s.trend.every(t=>typeof t.code === 'string' && typeof t.value === 'boolean' && (t.reference === null || Number.isFinite(t.reference))) && s.support.every(x=>typeof x.code === 'string' && (x.value === null || Number.isFinite(x.value))) && s.risks.every(x=>typeof x === 'string'), '근거 값');
    require(typeof s.quality.source === 'string' && Number.isFinite(s.quality.coverage) && s.quality.coverage >= 0 && s.quality.coverage <= 1 && s.quality.missing.every(x=>typeof x === 'string') && s.tradeConditions && typeof s.tradeConditions.ruleVersion === 'string', '품질 값');
    require(s.conditions?.length === 3 && ['buy_review','hold_review_if_held','sell_review_if_held'].every(type => s.conditions.filter(c => c.type === type).length === 1), '검토 조건');
    require(s.conditions.every(c => typeof c.review === 'boolean' && c.checks && Object.values(c.checks).every(v => typeof v === 'boolean')), '조건 값');
    require(!s.quality.financialAvailableFrom || (date(s.quality.financialAvailableFrom) && s.quality.financialAvailableFrom <= d.asOf), '재무 이용 가능일');
    codes.set(s.code,s); if (s.rank !== null) ranked.push(s);
  }
  ranked.sort((a,b) => a.rank-b.rank);
  require(ranked.every((s,i) => s.rank === i+1 && (i === 0 || ranked[i-1].score >= s.score)), '순위 연속성/점수순');
  const current = d.stocks.filter(s => s.listingStatus === 'observed_on_asOf').length, c = d.quality.coverage;
  require(c?.input === d.stocks.length && c.analyzed === ranked.length && c.notAnalyzed === d.stocks.length-ranked.length && c.currentSnapshot === current && c.historicalOnly === d.stocks.length-current, '종목 수 대사');
  require(c.full === d.stocks.filter(s=>s.scores.comprehensive !== null).length, '종합점수 수');
  require(Number.isFinite(d.risk.cashTargetFraction) && d.risk.cashTargetFraction >= 0 && d.risk.cashTargetFraction <= 1 && (d.risk.breadthAboveMA200 === null || Number.isFinite(d.risk.breadthAboveMA200) && d.risk.breadthAboveMA200 >= 0 && d.risk.breadthAboveMA200 <= 1), '위험 값');
  require(d.sectors.every(s=>typeof s.group === 'string' && Number.isSafeInteger(s.members) && s.members > 0 && Number.isFinite(s.relativeStrength) && typeof s.usable === 'boolean'), '업종 값');
  const signals = new Set();
  for (const s of d.signals) {
    const key = `${s.code}:${s.type}`, condition = codes.get(s.code)?.conditions.find(c => c.type === s.type);
    require(condition?.review === true && s.review === true && s.notAnOrder === true && s.asOf === d.asOf && !signals.has(key) && JSON.stringify(s.checks) === JSON.stringify(condition.checks), '신호 대사');
    signals.add(key);
  }
  require(d.stocks.reduce((n,s) => n+s.conditions.filter(c => c.review).length,0) === signals.size, '신호 누락');
  return d;
}
export function adaptMarket(d, now = new Date()) {
  validateMarket(d);
  const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(now);
  return {...d, status:d.status === 'stale' || d.asOf < today || !d.quality.latestSessionVerified ? 'stale' : 'partial', loadedAt:now.toISOString()};
}
let current;
export async function getMarket({fetcher = globalThis.fetch, now = new Date()} = {}) {
  try {
    const response = await fetcher(new URL('../data/prism-market.json',import.meta.url), {cache:'no-store',signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    current = adaptMarket(await response.json(),now);
  } catch (error) {
    current = {status:'error',asOf:null,stocks:catalog,signals:[],sectors:[],risk:null,error:String(error.message),quality:null};
  }
  return current;
}
export function analysisFor(code) { return current?.stocks.find(s => s.code === code) ?? null; }
export function selectStocks(stocks,{search='',sector='전체',sort='rank',scope='current',watchlist=null} = {}) {
  const q = search.trim().toUpperCase();
  return stocks.filter(s => (s.name.toUpperCase().includes(q) || s.code.includes(q)) && (sector === '전체' || s.sector === sector) && (!watchlist || watchlist.includes(s.code)) && (scope === 'all' || (scope === 'withheld' ? s.rank === null : scope === 'historical' ? s.listingStatus === 'historical_only_not_legal_status' : s.listingStatus === 'observed_on_asOf')))
    .sort((a,b) => sort === 'rank' ? (a.rank ?? Infinity)-(b.rank ?? Infinity) || a.code.localeCompare(b.code) : sort === 'comprehensive' ? (b.scores?.comprehensive ?? -1)-(a.scores?.comprehensive ?? -1) || a.code.localeCompare(b.code) : sort === 'code' ? a.code.localeCompare(b.code) : a.name.localeCompare(b.name,'ko')*(sort === 'reverse' ? -1 : 1));
}
