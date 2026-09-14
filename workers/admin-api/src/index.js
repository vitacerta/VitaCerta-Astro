import {authenticate,authRoute,loginPage} from './auth.js';
import {assert, HttpError, cleanHtml} from './validation.js';
import {sanity, readArticle, saveArticle} from './sanity.js';

const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow'};
const json = (data, status = 200) => new Response(JSON.stringify(data), {status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
async function readBody(request, max) {
  assert(Number(request.headers.get('content-length') || 0) <= max,'Arquivo ou dados muito grandes.',413);
  const reader = request.body?.getReader();
  assert(reader,'Dados ausentes.');
  const chunks = []; let total = 0;
  while (true) {
    const {done,value} = await reader.read(); if (done) break;
    total += value.length;
    if (total > max) { await reader.cancel(); throw new HttpError(413,'Arquivo ou dados muito grandes.'); }
    chunks.push(value);
  }
  const result = new Uint8Array(total); let offset=0;
  for (const chunk of chunks) { result.set(chunk,offset); offset+=chunk.length; }
  return result;
}
export function createHandler({auth = authenticate, makeSanity = sanity} = {}) {
  return async (request, env) => {
    try {
      const url = new URL(request.url);
      assert(env.ADMIN_ORIGIN && url.origin === env.ADMIN_ORIGIN,'Endereço do Admin não configurado ou não permitido.',503);
      if(url.pathname.startsWith('/auth/'))return await authRoute(request,env);
      try{await auth(request,env);}catch(error){
        if(error instanceof HttpError && error.status===401 && request.method==='GET' && (url.pathname==='/' || url.pathname.startsWith('/admin/')))return loginPage();
        throw error;
      }
      const isApi = url.pathname.startsWith('/api/');
      if (!isApi) {
        assert(request.method === 'GET' || request.method === 'HEAD','Método não permitido.',405);
        if (url.pathname === '/') return Response.redirect(`${url.origin}/admin/`,302);
        assert(url.pathname.startsWith('/admin/') || url.pathname.startsWith('/_astro/'), 'Página não encontrada.',404);
        const asset = await env.ASSETS.fetch(request);
        const response = new Response(asset.body,asset);
        for (const [k,v] of Object.entries(headers)) response.headers.set(k,v);
        response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
        return response;
      }
      assert(['GET','POST'].includes(request.method),'Método não permitido.',405);
      if (request.method === 'POST') {
        assert(request.headers.get('Origin') === env.ADMIN_ORIGIN && request.headers.get('X-VitaCerta-Admin') === '1','Origem da requisição não permitida.',403);
      }
      if (url.pathname === '/api/session' && request.method === 'GET') return json({authenticated:true,writesEnabled:env.WRITES_ENABLED === 'true'});
      if (url.pathname === '/api/preview' && request.method === 'POST') {
        assert(request.headers.get('Content-Type')?.split(';')[0] === 'application/json','Envie JSON.',415);
        let body; try { body=JSON.parse(new TextDecoder().decode(await readBody(request,850000))); } catch (e) { if(e instanceof HttpError) throw e; throw new HttpError(400,'JSON inválido.'); }
        return json({bodyHtml:cleanHtml(body.bodyHtml)});
      }
      if (request.method === 'POST') assert(env.WRITES_ENABLED === 'true','A gravação ainda não foi habilitada.',503);
      const api = makeSanity(env);
      if (url.pathname === '/api/categories' && request.method === 'GET') return json(await api.query('*[_type == "category" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))] | order(slug.current asc){_id,"slug":slug.current}'));
      if (url.pathname === '/api/articles' && request.method === 'GET') {
        const docs = await api.query('*[_type == "post" && !(_id in path("versions.**"))] | order(_updatedAt desc){_id,title,"slug":slug.current,_updatedAt,publishedAt,"category":categories[0]->slug.current,isHomeFeatured,showInHighlights,isCienciaVital}');
        const map = new Map();
        for (const doc of docs) {
          const id=doc._id.replace(/^drafts\./,'');
          if (!map.has(id) || doc._id.startsWith('drafts.')) map.set(id,{...doc,id,status:doc._id.startsWith('drafts.')?'draft':'published'});
        }
        return json([...map.values()]);
      }
      if (url.pathname === '/api/article' && request.method === 'GET') {
        const id=url.searchParams.get('id'); assert(/^[a-zA-Z0-9_-]{1,120}$/.test(id || ''),'Identificador inválido.');
        const state=await readArticle(api,id); assert(state.draft || state.published,'Artigo não encontrado.',404);
        const document=state.draft || state.published;
        const imageId=document.thumbnail?.asset?._ref || document.mainImage?.asset?._ref;
        const image=imageId ? await api.query('*[_id == $id][0]{url}',{id:imageId}) : null;
        return json({document,coverPreviewUrl:image?.url || document.coverUrl || '',expected:state.expected,published:!!state.published});
      }
      if (url.pathname === '/api/images' && request.method === 'POST') {
        const type=request.headers.get('Content-Type');
        const data=await readBody(request,5*1024*1024);
        const signature=Array.from(data.slice(0,12));
        const png=signature.slice(0,8).join(',') === '137,80,78,71,13,10,26,10';
        const jpg=signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
        const webp=new TextDecoder().decode(data.slice(0,4)) === 'RIFF' && new TextDecoder().decode(data.slice(8,12)) === 'WEBP';
        assert((type === 'image/png' && png) || (type === 'image/jpeg' && jpg) || (type === 'image/webp' && webp),'Use uma imagem PNG, JPEG ou WebP válida.',415);
        const asset=await api.upload(data,type);
        return json({id:asset.document._id,url:asset.document.url});
      }
      if (['/api/draft','/api/publish'].includes(url.pathname) && request.method === 'POST') {
        assert(request.headers.get('Content-Type')?.split(';')[0] === 'application/json','Envie JSON.',415);
        let input; try {input=JSON.parse(new TextDecoder().decode(await readBody(request,850000)));} catch(e) {if(e instanceof HttpError) throw e;throw new HttpError(400,'JSON inválido.');}
        return json(await saveArticle(api,input,url.pathname === '/api/publish'));
      }
      throw new HttpError(404,'Operação não encontrada.');
    } catch(error) {
      return json({error:error instanceof HttpError ? error.message : 'Não foi possível concluir. Tente novamente.'},error instanceof HttpError ? error.status : 500);
    }
  };
}
export default {fetch:createHandler()};
