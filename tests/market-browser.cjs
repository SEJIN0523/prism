const {chromium}=require(process.env.PRISM_PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict');
const data=require('../data/prism-market.json');
const base=process.env.PRISM_BASE_URL || 'http://127.0.0.1:4173/prism/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PRISM_BROWSER_EXECUTABLE || '/usr/bin/chromium',headless:true});
 try {
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
 const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'#explore');await p.waitForSelector('#search');
 assert.match(await p.locator('.market-status').textContent(),/stale.*2026-10-20/s);
 assert.match(await p.locator('.market-status').textContent(),/연구용·수익성 미검증/);
 assert.equal(await p.locator('.stock-row').count(),50);
 assert.match(await p.locator('.stock-name').first().textContent(),/서산/);
 await p.locator('[data-action=more-stocks]').click();assert.equal(await p.locator('.stock-row').count(),100);
 await p.locator('#scope').selectOption('withheld');assert.match(await p.locator('.list-caption').textContent(),/714개/);assert.equal(await p.locator('.withheld').count(),50);
 await p.locator('#scope').selectOption('historical');assert.match(await p.locator('.list-caption').textContent(),/162개/);
 await p.locator('#scope').selectOption('all');assert.match(await p.locator('.list-caption').textContent(),/2924개/);
 const alpha=data.stocks.find(s=>/[A-Z]/.test(s.code));
 await p.locator('#search').fill(alpha.code.toLowerCase());assert.equal(await p.locator('.stock-row').count(),1);
 await p.locator('.stock-name').click();await p.waitForSelector('h1');assert.equal(await p.locator('h1').textContent(),alpha.name);
 await p.goto(base+'#detail/079650');await p.waitForSelector('.decision');
 assert.equal(await p.locator('.decision').count(),3);assert.match(await p.locator('#main').textContent(),/98.24.*종합점수/s);
 assert.match(await p.locator('#main').textContent(),/지표 부족/);
 await p.goto(base+'#detail/000040');await p.waitForSelector('.decision');assert.match(await p.locator('#main').textContent(),/순위 보류/);assert.match(await p.locator('#main').textContent(),/기업행동 확인 필요/);
 await p.goto(base+'#explore');await p.locator('#search').fill('');await p.locator('#scope').selectOption('current');await p.locator('#sort').selectOption('comprehensive');assert.doesNotMatch(await p.locator('.stock-score').first().textContent(),/종합 —/);
 // Deliberate remote strings must remain text, never markup.
 await p.route('**/data/prism-market.json',route=>{const d=structuredClone(data);d.stocks.find(s=>s.rank===1).name='<img src=x onerror="window.pwned=1">';return route.fulfill({json:d});});
 await p.reload();await p.waitForSelector('#search');assert.equal(await p.locator('#stock-list img').count(),0);assert.equal(await p.evaluate(()=>window.pwned),undefined);
 await p.unroute('**/data/prism-market.json');
 const saved=await p.evaluate(()=>{localStorage.setItem('prism-v1-state',JSON.stringify({schema:1,initialCash:1234,transactions:[],watchlist:['005930'],quotes:{},settings:{theme:'dark',number:'full',home:'home',target:10}}));return localStorage.getItem('prism-v1-state');});
 for(const failure of ['http','json','schema','offline']) {
  await p.route('**/data/prism-market.json',r=>failure==='http'?r.fulfill({status:503,body:'unavailable'}):failure==='json'?r.fulfill({body:'{broken',contentType:'application/json'}):failure==='schema'?r.fulfill({json:{}}):r.abort());
  await p.reload();await p.waitForSelector('#search');assert.match(await p.locator('.market-status').textContent(),/로딩 실패/);assert.equal(await p.locator('.rank').count(),0);assert.equal(await p.evaluate(()=>localStorage.getItem('prism-v1-state')),saved);
  await p.unroute('**/data/prism-market.json');
 }
 await p.locator('[data-action=refresh-market]').click();await p.waitForFunction(()=>document.querySelector('.market-status')?.textContent.includes('stale'));
 assert.deepEqual(errors,[]);
 console.log('PASS: actual JSON, counts/scopes, rank/score, 50-row pagination, alphanumeric search/detail, conditions/reasons, XSS, HTTP/JSON/schema/network failure, retry, records preserved');
 await context.close();
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
