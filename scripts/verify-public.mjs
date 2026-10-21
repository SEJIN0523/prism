import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateMarket} from '../services/market.js';
const bytes=await readFile(new URL('../data/prism-market.json',import.meta.url)),text=bytes.toString('utf8'),data=validateMarket(JSON.parse(text));
const forbidden=new Set(['portfolio','positions','transactions','avgCost','highWater','initialCash','cashAfterReserve','totalReserved','inputKind','apiKey','api_key','crtfc_key','AUTH_KEY','absolutePath','localFile']);
function walk(v){if(!v || typeof v!=='object')return;for(const [k,x] of Object.entries(v)){if(forbidden.has(k))throw Error('Private field in public payload');walk(x);}}
walk(data);
if(/[A-Za-z]:\\|C:\//.test(text) || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/.test(text))throw Error('Private path or credential pattern in public payload');
for(const [k,v] of Object.entries(process.env))if(/KEY|TOKEN|SECRET|PASSWORD/i.test(k)&&v?.length>=16&&text.includes(v))throw Error('Credential literal in public payload');
console.log(JSON.stringify({status:'PASS_PUBLIC_ONLY',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),asOf:data.asOf,coverage:data.quality.coverage}));
