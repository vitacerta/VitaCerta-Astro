import test from 'node:test';
import assert from 'node:assert/strict';
import {getCloudflareMetrics,normalizeCloudflare,periodDates} from '../src/cloudflare.js';

test('intervalo cobre o período atual e o anterior sem sobreposição',()=>{
  assert.deepEqual(periodDates(7,new Date('2026-09-19T15:00:00Z')),{
    start:'2026-09-13T00:00:00.000Z',end:'2026-09-20T00:00:00.000Z',previousStart:'2026-09-06T00:00:00.000Z'
  });
});
test('normaliza métricas e páginas da resposta GraphQL',()=>{
  const data=normalizeCloudflare({data:{viewer:{zones:[{current:[{count:120,sum:{visits:80}}],previous:[{count:90,sum:{visits:60}}],topPages:[{count:40,sum:{visits:25},dimensions:{clientRequestPath:'/saude/'}}]}]}}});
  assert.deepEqual(data,{configured:true,visits:80,requests:120,previousVisits:60,previousRequests:90,topPages:[{path:'/saude/',visits:25,requests:40}]});
});
test('sem credenciais retorna estado configurável e não chama a rede',async()=>{
  let called=false;const data=await getCloudflareMetrics({},async()=>{called=true});
  assert.equal(data.configured,false);assert.equal(called,false);
});
test('token fica no servidor e a consulta exclui tráfego interno da Cloudflare',async()=>{
  let received;
  const data=await getCloudflareMetrics({CLOUDFLARE_ZONE_ID:'zone',CLOUDFLARE_ANALYTICS_TOKEN:'secret-token',SITE_HOSTNAME:'vitacerta.com.br'},async(_url,init)=>{
    received=init;return Response.json({data:{viewer:{zones:[{current:[],previous:[],topPages:[]}]}}});
  });
  assert.equal(received.headers.Authorization,'Bearer secret-token');
  assert.match(JSON.parse(received.body).query,/requestSource:"eyeball"/);
  assert.doesNotMatch(JSON.stringify(data),/secret-token/);
});
