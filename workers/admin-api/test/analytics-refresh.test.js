import assert from 'node:assert/strict';
import test from 'node:test';
import {fetchArticlePageviews} from '../src/analytics.js';

test('cada abertura consulta novamente o acumulado até a hora atual',async()=>{
  const originalFetch=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async(_url,options)=>{
    requests.push(JSON.parse(options.body).variables);
    return new Response(JSON.stringify({data:{viewer:{accounts:[{rows:[
      {count:requests.length===1 ? 100 : 103,dimensions:{requestPath:'/conteudos/artigo-a/'}}
    ]}]}}}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  const env={
    CF_ANALYTICS_API_TOKEN:'token-de-teste',
    CF_ACCOUNT_ID:'conta',
    CF_WEB_ANALYTICS_SITE_TAG:'site',
    ANALYTICS_START_DATE:'2026-10-03'
  };
  try {
    const first=await fetchArticlePageviews(env,{now:()=>new Date('2026-10-03T21:00:00Z')});
    const second=await fetchArticlePageviews(env,{now:()=>new Date('2026-10-03T21:00:10Z')});
    assert.equal(requests.length,2);
    assert.equal(first.pageviews['/conteudos/artigo-a'],100);
    assert.equal(second.pageviews['/conteudos/artigo-a'],103);
    assert.equal(second.from,'2026-10-03');
    assert.equal(second.updatedAt,'2026-10-03T21:00:10.000Z');
    assert.equal(requests[0].start,'2026-10-03T03:00:00.000Z');
    assert.equal(requests[1].start,requests[0].start);
    assert.equal(requests[1].end,second.updatedAt);
  } finally {
    globalThis.fetch=originalFetch;
  }
});
