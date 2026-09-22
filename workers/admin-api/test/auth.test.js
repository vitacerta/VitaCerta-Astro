import test from 'node:test';
import assert from 'node:assert/strict';
import {EncryptJWT,jwtDecrypt,base64url} from 'jose';
import {authRoute,authenticate} from '../src/auth.js';
import {createHandler} from '../src/index.js';
const env={ADMIN_ORIGIN:'https://admin.example.com',GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-only-client-secret',SESSION_SECRET:'test-only-session-secret-not-for-production',ALLOWED_GITHUB_IDS:'123',WRITES_ENABLED:'true'};
const key=async()=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.SESSION_SECRET)));
async function start(){
  const response=await authRoute(new Request(env.ADMIN_ORIGIN+'/auth/login'),env);
  const cookie=response.headers.getSetCookie()[0].split(';')[0];
  const location=new URL(response.headers.get('Location'));
  return {response,cookie,location};
}
async function complete({id=123,scope='',stateOverride,cookieOverride}={}){
  const {cookie,location}=await start();let calls=0;
  const req=new Request(env.ADMIN_ORIGIN+'/auth/callback?code=test-code&state='+(stateOverride || location.searchParams.get('state')),{headers:{Cookie:cookieOverride || cookie}});
  const response=await authRoute(req,env,async(url,init)=>{
    calls++;
    assert.equal(init.redirect,'manual');
    if(url.endsWith('access_token')){
      const verifier=init.body.get('code_verifier');
      assert.equal(base64url.encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)))),location.searchParams.get('code_challenge'));
      assert.equal(init.body.get('redirect_uri'),env.ADMIN_ORIGIN+'/auth/callback');
      return Response.json({access_token:'test-token-never-return-to-browser',scope});
    }
    assert.equal(url,'https://api.github.com/user');assert.equal(init.headers.Authorization,'Bearer test-token-never-return-to-browser');
    return Response.json({id,login:'public-name'});
  });
  return {response,calls};
}
test('OAuth usa state aleatório, PKCE S256, callback fixo e cookie protegido',async()=>{
  const a=await start(),b=await start();assert.notEqual(a.cookie,b.cookie);
  assert.equal(a.location.origin,'https://github.com');assert.equal(a.location.searchParams.get('scope'),'');
  assert.equal(a.location.searchParams.get('code_challenge_method'),'S256');
  assert.match(a.response.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
  assert.equal(a.response.headers.get('Cache-Control'),'no-store');
});
test('callback aceita somente identidade permitida e nunca entrega token GitHub',async()=>{
  const {response,calls}=await complete();assert.equal(calls,2);assert.equal(response.status,303);
  assert.equal(response.headers.get('Location'),env.ADMIN_ORIGIN+'/admin/');
  const session=response.headers.getSetCookie().find(x=>x.startsWith('__Host-vc-session='));
  assert.match(session,/HttpOnly; Secure; SameSite=Lax; Max-Age=3600/);
  const {payload}=await jwtDecrypt(session.split(';')[0].split('=')[1],await key());
  assert.equal(payload.sub,'123');assert.equal(payload.access_token,undefined);
  assert.doesNotMatch([...response.headers.values()].join(' '),/test-token/);
  const user=await authenticate(new Request(env.ADMIN_ORIGIN,{headers:{Cookie:session.split(';')[0]}}),env);assert.equal(user.sub,'123');
  await assert.rejects(authenticate(new Request(env.ADMIN_ORIGIN,{headers:{Cookie:session.split(';')[0]}}),{...env,ALLOWED_GITHUB_IDS:'456'}),{status:403});
});
test('state/cookie inválido abortam antes de qualquer chamada ao GitHub',async()=>{
  for(const args of [{stateOverride:'forged-state'},{cookieOverride:'__Host-vc-oauth=forged-cookie'}]){
    const {response,calls}=await complete(args);assert.equal(response.status,401);assert.equal(calls,0);
    assert.match(response.headers.get('Set-Cookie'),/Max-Age=0/);
  }
});
test('conta não autorizada e permissões excessivas não criam sessão',async()=>{
  for(const args of [{id:456},{scope:'repo'},{scope:'user:email'}]){
    const {response}=await complete(args);assert.equal(response.status,403);
    assert.ok(!response.headers.getSetCookie().some(x=>x.startsWith('__Host-vc-session=')));
  }
});
test('sessão expirada, forjada ou de outro propósito é negada',async()=>{
  for(const [aud,expiry] of [['admin-session',2],['oauth-flow',Math.floor(Date.now()/1000)+600]]){
    const token=await new EncryptJWT({sub:'123'}).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setIssuer(env.ADMIN_ORIGIN).setAudience(aud).setIssuedAt(1).setExpirationTime(expiry).encrypt(await key());
    await assert.rejects(authenticate(new Request(env.ADMIN_ORIGIN,{headers:{Cookie:'__Host-vc-session='+token}}),env),{status:401});
  }
  await assert.rejects(authenticate(new Request(env.ADMIN_ORIGIN,{headers:{Cookie:'__Host-vc-session=forged'}}),env),{status:401});
});
test('sem sessão, API/assets negados e página do Admin mostra apenas login',async()=>{
  const handler=createHandler({makeSanity:()=>{throw Error('Sanity não deveria ser chamado');}});
  for(const path of ['/api/articles','/api/draft','/_astro/app.js'])assert.equal((await handler(new Request(env.ADMIN_ORIGIN+path),env)).status,401);
  const response=await handler(new Request(env.ADMIN_ORIGIN+'/admin/'),env);assert.match(await response.text(),/Entrar com GitHub/);
  assert.equal((await handler(new Request(env.ADMIN_ORIGIN+'/api/session'),{...env,SESSION_SECRET:''})).status,503);
});
test('sair exige POST da origem exata e apaga cookie de sessão',async()=>{
  await assert.rejects(authRoute(new Request(env.ADMIN_ORIGIN+'/auth/logout'),env),{status:405});
  await assert.rejects(authRoute(new Request(env.ADMIN_ORIGIN+'/auth/logout',{method:'POST',headers:{Origin:'https://evil.test','X-VitaCerta-Admin':'1'}}),env),{status:403});
  const response=await authRoute(new Request(env.ADMIN_ORIGIN+'/auth/logout',{method:'POST',headers:{Origin:env.ADMIN_ORIGIN,'X-VitaCerta-Admin':'1'}}),env);
  assert.match(response.headers.get('Set-Cookie'),/__Host-vc-session=;.*Max-Age=0/);
});


test('OAuth rejects redirects at both upstream steps without creating a session',async()=>{
  for(const redirectStep of [1,2]){
    const {cookie,location}=await start();let calls=0;
    const request=new Request(env.ADMIN_ORIGIN+'/auth/callback?code=test-code&state='+location.searchParams.get('state'),{headers:{Cookie:cookie}});
    const response=await authRoute(request,env,async(url,init)=>{
      calls++;assert.equal(init.redirect,'manual');
      if(calls===redirectStep)return new Response(null,{status:302,headers:{Location:'https://example.invalid/collect'}});
      return Response.json({access_token:'test-token',scope:''});
    });
    assert.equal(response.status,502);assert.equal(calls,redirectStep);
    assert.ok(!response.headers.getSetCookie().some(x=>x.startsWith('__Host-vc-session=')));
  }
});
