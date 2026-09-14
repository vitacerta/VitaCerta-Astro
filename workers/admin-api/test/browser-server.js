// TEST ONLY: synthetic Sanity + authentication, bound exclusively to loopback.
// Never imported by src/index.js or included in the Worker deployment.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHandler} from '../src/index.js';
import {fakeApi} from './fixture.js';
const root=resolve('../../dist');
const data=fakeApi();const query=data.query.bind(data);
data.query=async(q,p)=>{
  if(q.includes('order(slug.current'))return [{_id:'category-1',slug:'saude'}];
  if(q.includes('order(_updatedAt'))return Object.values(data.docs).filter(d=>d._type==='post').map(d=>({...d,slug:d.slug.current,category:'saude'}));
  return query(q,p);
};
data.upload=async()=>({document:{_id:'image-abcdef-1600x900-jpg',url:''}});
const env={ADMIN_ORIGIN:'http://127.0.0.1:8788',WRITES_ENABLED:'true',ASSETS:{async fetch(request){
  let path=decodeURIComponent(new URL(request.url).pathname);if(path.endsWith('/'))path+='index.html';
  const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))return new Response('',{status:403});
  try{return new Response(await readFile(file),{headers:{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'})[extname(file)] || 'application/octet-stream'}});}catch{return new Response('',{status:404});}
}}};
const handler=createHandler({auth:async()=>({email:'teste-local@example.invalid'}),makeSanity:()=>data});
http.createServer(async(req,res)=>{
  try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const bytes=Buffer.concat(chunks);
  const response=await handler(new Request(env.ADMIN_ORIGIN+req.url,{method:req.method,headers:req.headers,...(bytes.length?{body:bytes}:{})}),env);
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Erro no servidor de teste');}
}).listen(8788,'127.0.0.1',()=>console.log('Teste local com dados fictícios: http://127.0.0.1:8788/admin/'));
