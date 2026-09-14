import {fakeApi} from './fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair, SignJWT} from 'jose';
import {cleanHtml, validateInput} from '../src/validation.js';
import {verifyAccessToken, authenticate} from '../src/auth.js';
import {createHandler} from '../src/index.js';
import {saveArticle} from '../src/sanity.js';

const env={ADMIN_ORIGIN:'https://admin.example.com',ACCESS_TEAM_DOMAIN:'https://test.cloudflareaccess.com',ACCESS_AUD:'test-app',ADMIN_EMAILS:'editor@example.com',WRITES_ENABLED:'true'};
const input=()=>({id:'post-1',expected:{draftRevision:null,publishedRevision:null},title:'Artigo de teste',slug:'artigo-de-teste',description:'Descrição',categoryId:'category-1',bodyHtml:'<h2>Conteúdo</h2><p>Texto editorial.</p>',thumbnailId:'image-abcdef-1600x900-jpg',thumbnailAlt:'Capa',isHomeFeatured:false,showInHighlights:false,isCienciaVital:false});
test('HTML remove scripts, handlers, SVG, frames, CSS e URLs executáveis',()=>{
  const html=cleanHtml('<script>alert(1)</script><svg onload="x"><script>x</script></svg><iframe src="https://evil.test"></iframe><p onclick="x" style="position:fixed">texto</p><a href="java&#x09;script:alert(1)" target="_blank">link</a><img src="data:image/svg+xml,x" onerror="x"><a href="//evil.test">x</a>');
  assert.doesNotMatch(html,/script|onload|onclick|onerror|iframe|<svg|style=|data:|href="\/\//i);
  assert.match(html,/<p>texto<\/p>/);assert.match(html,/noopener noreferrer/);
});
test('HTML conserva conteúdo editorial e links https',()=>{assert.match(cleanHtml('<h2>Título</h2><p>Texto <strong>forte</strong></p><a href="https://example.com">fonte</a>'),/href="https:\/\/example.com"/);});
test('validação rejeita campos arbitrários, agendamento, tipos e slug inválido',()=>{
  for(const patch of [{publishedAt:'2030-01-01'},{language:'en'},{slug:'../x'},{isCienciaVital:'true'},{categoryId:'drafts.category'},{description:'x'.repeat(301)}])assert.throws(()=>validateInput({...input(),...patch},true));
  assert.equal(validateInput(input(),true).language,'pt-BR');
});
test('autenticação valida assinatura, público, emissor, prazo e editor',async()=>{
  const {privateKey,publicKey}=await generateKeyPair('RS256');
  const sign=(changes={})=>new SignJWT({email:'editor@example.com',...changes}).setProtectedHeader({alg:'RS256'}).setSubject('user').setIssuedAt().setIssuer(env.ACCESS_TEAM_DOMAIN).setAudience(env.ACCESS_AUD).setExpirationTime('1h').sign(privateKey);
  assert.equal((await verifyAccessToken(await sign(),env,publicKey)).email,'editor@example.com');
  await assert.rejects(verifyAccessToken(await sign({email:'intruso@example.com'}),env,publicKey),{status:403});
  await assert.rejects(verifyAccessToken(await sign(),{...env,ACCESS_AUD:'other'},publicKey),{status:401});
  await assert.rejects(verifyAccessToken(await sign(),{...env,ACCESS_TEAM_DOMAIN:'https://other.cloudflareaccess.com'},publicKey),{status:401});
  const expired=await new SignJWT({email:'editor@example.com'}).setProtectedHeader({alg:'RS256'}).setSubject('u').setIssuedAt(1).setIssuer(env.ACCESS_TEAM_DOMAIN).setAudience(env.ACCESS_AUD).setExpirationTime(2).sign(privateKey);
  await assert.rejects(verifyAccessToken(expired,env,publicKey),{status:401});
  const other=await generateKeyPair('RS256');await assert.rejects(verifyAccessToken(await sign(),env,other.publicKey),{status:401});
  await assert.rejects(authenticate(new Request(env.ADMIN_ORIGIN),env),{status:401});
});
test('endpoint real falha fechado sem autenticação/configuração, inclusive assets',async()=>{
  const handler=createHandler();
  for(const path of ['/api/articles','/api/draft','/admin/'])assert.equal((await handler(new Request(env.ADMIN_ORIGIN+path),env)).status,401);
  assert.equal((await handler(new Request(env.ADMIN_ORIGIN+'/api/session'),{...env,ACCESS_AUD:''})).status,503);
});
const request=(path,body,origin=env.ADMIN_ORIGIN)=>new Request(env.ADMIN_ORIGIN+'/api/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-VitaCerta-Admin':'1'},body:JSON.stringify(body)});
test('CSRF, chave de habilitação e tamanho são bloqueados antes do Sanity',async()=>{
  const handler=createHandler({auth:async()=>({}),makeSanity:()=>{throw new Error('Sanity não deveria ser chamado');}});
  assert.equal((await handler(request('draft',input(),'https://evil.test'),env)).status,403);
  assert.equal((await handler(request('draft',input()),{...env,WRITES_ENABLED:'false'})).status,503);
  assert.equal((await handler(request('preview',{bodyHtml:'a'.repeat(900000)}),env)).status,413);
});
test('preview sanitiza e não consulta nem grava no Sanity',async()=>{
  const handler=createHandler({auth:async()=>({}),makeSanity:()=>{throw new Error('Sem Sanity em preview');}});
  const response=await handler(request('preview',{bodyHtml:'<p onclick="bad()">prévia</p>'}),{...env,WRITES_ENABLED:'false'});
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{bodyHtml:'<p>prévia</p>'});
  assert.equal(response.headers.get('Cache-Control'),'no-store');
});
test('rascunho usa drafts e não cria publicação ou data',async()=>{
  const api=fakeApi();const result=await saveArticle(api,input(),false);
  assert.equal(result.status,'draft');assert.ok(api.docs['drafts.post-1']);assert.equal(api.docs['post-1'],undefined);assert.equal(api.docs['drafts.post-1'].publishedAt,undefined);
  assert.equal(api.docs['drafts.post-1'].categories[0]._ref,'category-1');
});
test('publicar promove rascunho na mesma transação e edição preserva publishedAt/legados',async()=>{
  const api=fakeApi();const draft=await saveArticle(api,input(),false);
  const pub=await saveArticle(api,{...input(),expected:draft.expected},true,'2026-09-13T12:00:00.000Z');
  assert.equal(api.docs['drafts.post-1'],undefined);assert.equal(api.docs['post-1'].publishedAt,'2026-09-13T12:00:00.000Z');
  api.docs['post-1'].legacyBodyHtml='<p>legado</p>';
  const edit=await saveArticle(api,{...input(),title:'Editado',expected:pub.expected},false);
  await saveArticle(api,{...input(),title:'Editado',expected:edit.expected},true,'2026-09-14T12:00:00.000Z');
  assert.equal(api.docs['post-1'].publishedAt,'2026-09-13T12:00:00.000Z');assert.equal(api.docs['post-1'].legacyBodyHtml,'<p>legado</p>');
});
test('revisão obsoleta e slug ocupado não gravam',async()=>{
  const api=fakeApi();await saveArticle(api,input(),false);const count=api.transactions.length;
  await assert.rejects(saveArticle(api,input(),false),{status:409});
  await assert.rejects(saveArticle(api,{...input(),id:'post-2'},false),{status:409});assert.equal(api.transactions.length,count);
});
test('categoria inexistente e publicação incompleta são rejeitadas',async()=>{
  await assert.rejects(saveArticle(fakeApi(),{...input(),categoryId:'missing'},true));
  await assert.rejects(saveArticle(fakeApi(),{...input(),thumbnailId:''},true));
  await assert.rejects(saveArticle(fakeApi(),{...input(),bodyHtml:'<script>x</script>'},true));
});
test('publicação retira outros destaques Home atomicamente',async()=>{
  const api=fakeApi({older:{_id:'older',_type:'post',_rev:'old',isHomeFeatured:true,publishedAt:'2020-01-01'}});
  await saveArticle(api,{...input(),isHomeFeatured:true},true);
  assert.equal(api.docs.older.isHomeFeatured,false);assert.equal(api.docs['post-1'].isHomeFeatured,true);assert.equal(api.transactions.length,1);
});
