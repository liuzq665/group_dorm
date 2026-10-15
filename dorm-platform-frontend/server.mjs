import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=path.dirname(fileURLToPath(import.meta.url));
const root=process.env.SERVE_DIST==='1'?path.join(project,'dist'):project;
const port=Number(process.env.PORT||5173);
const backend=new URL(process.env.API_TARGET||'http://127.0.0.1:8080');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){
  const upstream=http.request({hostname:backend.hostname,port:backend.port||80,path:req.url,method:req.method,headers:{...req.headers,host:backend.host}},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
  upstream.setTimeout(65000,()=>upstream.destroy());
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({code:502,message:'Backend unavailable',data:null}));});
  req.pipe(upstream);return;
 }
 let requested;try{requested=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
 if(requested==='/'||requested==='/login')requested='/index.html';
 const safe=path.resolve(root,'.'+requested);
 const allowed=requested==='/index.html'||/^\/src\/[a-zA-Z0-9_-]+\.(js|css)$/.test(requested);
 if(!allowed||!safe.startsWith(root+path.sep)||!['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end('Not found');return;}
 fs.readFile(safe,(error,data)=>{if(error){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(safe)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);});
}).listen(port,'127.0.0.1',()=>console.log(`Dorm platform: http://localhost:${port}/login`));
