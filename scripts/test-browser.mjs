import {spawn} from 'node:child_process';
import {preview} from './preview.mjs';
import {buildPages} from './build-pages.mjs';
await buildPages();
const server=await preview({port:0});
try {
 for(const file of ['browser.cjs','release-browser.cjs','pwa-browser.cjs','market-browser.cjs']) {
  const code=await new Promise((ok,no)=>{const p=spawn(process.execPath,['tests/'+file],{stdio:'inherit',env:{...process.env,PRISM_BASE_URL:`http://127.0.0.1:${server.address().port}/prism/`}});p.on('error',no);p.on('exit',ok);});
  if(code!==0) throw Error(`${file} failed (${code})`);
 }
} finally {server.close();}
