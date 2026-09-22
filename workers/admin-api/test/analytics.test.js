import assert from 'node:assert/strict';
import test from 'node:test';
import {fetchArticlePageviews,normalizeArticlePath} from '../src/analytics.js';

test('normaliza variações do endereço do mesmo artigo',()=>{
  assert.equal(normalizeArticlePath('https://vitacerta.com.br/conteudos/exemplo/?origem=teste'),'/conteudos/exemplo');
  assert.equal(normalizeArticlePath('/conteudos/exemplo/'),'/conteudos/exemplo');
});

test('não consulta a Cloudflare sem todas as configurações',async()=>{
  let called=false;
  const result=await fetchArticlePageviews({},{
    fetchImpl:async()=>{called=true;throw new Error('não deveria consultar');},
    now:()=>new Date('2026-09-22T12:00:00Z')
  });
  assert.equal(called,false);
  assert.deepEqual(result,{configured:false,from:'2026-09-21',pageviews:{},updatedAt:null});
});

test('agrupa visualizações por artigo e ignora páginas que não são artigos',async()=>{
  let requestBody;
  const fetchImpl=async(_url,options)=>{
    requestBody=JSON.parse(options.body);
    return new Response(JSON.stringify({data:{viewer:{accounts:[{rows:[
      {count:3,dimensions:{requestPath:'/conteudos/artigo-a/'}},
      {count:2,dimensions:{requestPath:'/conteudos/artigo-a'}},
      {count:7,dimensions:{requestPath:'/'}},
      {count:4,dimensions:{requestPath:'/conteudos/artigo-b/'}}
    ]}]}}}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  const result=await fetchArticlePageviews({
    CF_ANALYTICS_API_TOKEN:'segredo',
    CF_ACCOUNT_ID:'conta',
    CF_WEB_ANALYTICS_SITE_TAG:'site',
    ANALYTICS_START_DATE:'2026-09-21'
  },{fetchImpl,now:()=>new Date('2026-09-22T12:00:00Z')});

  assert.equal(requestBody.variables.accountTag,'conta');
  assert.equal(requestBody.variables.siteTag,'site');
  assert.equal(requestBody.variables.requestHost,'vitacerta.com.br');
  assert.deepEqual(result.pageviews,{
    '/conteudos/artigo-a':5,
    '/conteudos/artigo-b':4
  });
});
