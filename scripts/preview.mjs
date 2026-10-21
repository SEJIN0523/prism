import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,relative,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../_site/',import.meta.url));
export function preview({port=4173,host='127.0.0.1'}={}) {
 const server=createServer(async(req,res)=>{
  try {
   const url=new URL(req.url,'http://localhost');
   if(req.method!=='GET' || !url.pathname.startsWith('/prism/')) {res.writeHead(404);res.end();return;}
   const name=decodeURIComponent(url.pathname.slice(7)) || 'index.html';
   const path=resolve(root,name), rel=relative(root,path);
   if(rel.startsWith('..') || isAbsolute(rel)) {res.writeHead(403);res.end();return;}
   const bytes=await readFile(path);
   const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png'};
   res.writeHead(200,{'Content-Type':(mime[extname(path)] || 'application/octet-stream')+(extname(path)==='.png'?'':'; charset=utf-8'),'Cache-Control':'no-store'});res.end(bytes);
  } catch {res.writeHead(404);res.end();}
 });
 return new Promise((ok,no)=>{server.once('error',no);server.listen(port,host,()=>ok(server));});
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 const port=Number(process.env.PORT || 4173),host=process.env.HOST || '127.0.0.1';
 await preview({port,host});console.log(`PRISM preview: http://${host}:${port}/prism/ (local only; no deployment)`);
}
