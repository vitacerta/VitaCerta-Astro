import {EncryptJWT, jwtDecrypt, base64url} from 'jose';
import {assert, HttpError} from './validation.js';
const SESSION='__Host-vc-session', FLOW='__Host-vc-oauth';
const common={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow'};
const cookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const random=()=>base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
function cookies(request,name){
  const values=(request.headers.get('Cookie') || '').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));
  assert(values.length<=1,'Sessão inválida.',401);
  return values[0]?.slice(name.length+1);
}
function configured(env){
  assert(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && /^[0-9]+(?:,[0-9]+)*$/.test(env.ALLOWED_GITHUB_IDS || '') && typeof env.SESSION_SECRET==='string' && env.SESSION_SECRET.length>=32,'Login GitHub ainda não configurado.',503);
  assert(/^https:\/\//.test(env.ADMIN_ORIGIN || '') && new URL(env.ADMIN_ORIGIN).origin===env.ADMIN_ORIGIN,'Endereço seguro do Admin ainda não configurado.',503);
}
async function key(env){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.SESSION_SECRET)));}
async function seal(payload,env,audience,seconds){
  return new EncryptJWT(payload).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setIssuedAt().setIssuer(env.ADMIN_ORIGIN).setAudience(audience).setExpirationTime(`${seconds}s`).encrypt(await key(env));
}
async function unseal(value,env,audience){
  assert(typeof value==='string' && value.length<4096,'Entre novamente para acessar o Admin.',401);
  try{return (await jwtDecrypt(value,await key(env),{issuer:env.ADMIN_ORIGIN,audience,keyManagementAlgorithms:['dir'],contentEncryptionAlgorithms:['A256GCM'],requiredClaims:['iat','exp']})).payload;}
  catch{throw new HttpError(401,'Sessão inválida ou expirada. Entre novamente.');}
}
export async function authenticate(request,env){
  configured(env);
  const session=await unseal(cookies(request,SESSION),env,'admin-session');
  assert(typeof session.sub==='string' && env.ALLOWED_GITHUB_IDS.split(',').includes(session.sub),'Acesso não autorizado.',403);
  return session;
}
export function loginPage(message='Entre com sua conta autorizada para acessar o painel.',status=200){
  const safe=message.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Entrar | VitaCerta Admin</title><style>body{font:18px system-ui;background:#f4f6f4;color:#1f2f28;display:grid;min-height:90vh;place-items:center}main{max-width:420px;padding:32px;background:white;border-radius:14px}a{display:inline-block;padding:12px 20px;background:#245640;color:white;border-radius:10px;text-decoration:none}p{line-height:1.5}</style><main><h1>VitaCerta Admin</h1><p>${safe}</p><a href="/auth/login">Entrar com GitHub</a></main></html>`,{status,headers:{...common,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}});
}
function redirect(location,setCookies=[]){
  const headers=new Headers({...common,Location:location});for(const item of setCookies)headers.append('Set-Cookie',item);
  return new Response(null,{status:303,headers});
}
export async function authRoute(request,env,fetcher=fetch){
  const url=new URL(request.url);
  if(url.pathname==='/auth/logout'){
    assert(request.method==='POST','Método não permitido.',405);
    assert(request.headers.get('Origin')===env.ADMIN_ORIGIN && request.headers.get('X-VitaCerta-Admin')==='1','Origem não permitida.',403);
    return new Response(JSON.stringify({ok:true}),{headers:{...common,'Content-Type':'application/json','Set-Cookie':cookie(SESSION,'',0)}});
  }
  assert(request.method==='GET','Método não permitido.',405);
  configured(env);
  if(url.pathname==='/auth/login'){
    const state=random(),verifier=random();
    const challenge=base64url.encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
    const params=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:`${env.ADMIN_ORIGIN}/auth/callback`,scope:'',state,code_challenge:challenge,code_challenge_method:'S256',allow_signup:'false'});
    return redirect(`https://github.com/login/oauth/authorize?${params}`,[cookie(FLOW,await seal({state,verifier},env,'oauth-flow',600),600)]);
  }
  assert(url.pathname==='/auth/callback','Página não encontrada.',404);
  try{
    assert(!url.searchParams.has('error'),'Login cancelado. Tente novamente.',401);
    const flow=await unseal(cookies(request,FLOW),env,'oauth-flow');
    assert(typeof flow.state==='string' && flow.state===url.searchParams.get('state') && typeof flow.verifier==='string','Solicitação de login inválida. Tente novamente.',401);
    const code=url.searchParams.get('code');assert(code && code.length<=256,'Código de login inválido.',401);
    const response=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:`${env.ADMIN_ORIGIN}/auth/callback`,code_verifier:flow.verifier}),signal:AbortSignal.timeout(15000),redirect:'manual'});
    assert(response.ok,'Não foi possível concluir o login pelo GitHub.',502);
    const token=await response.json();
    assert(typeof token.access_token==='string' && !token.error,'Código de login expirado ou inválido.',401);
    // Public identity only: no repository, email or private profile permissions.
    assert(!token.scope || token.scope.trim()==='','O aplicativo solicitou permissões além da identidade pública. Revise sua configuração.',403);
    const identity=await fetcher('https://api.github.com/user',{headers:{Authorization:`Bearer ${token.access_token}`,Accept:'application/vnd.github+json','User-Agent':'VitaCerta-Admin','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(15000),redirect:'manual'});
    assert(identity.ok,'Não foi possível confirmar sua identidade no GitHub.',502);
    const user=await identity.json();
    assert(Number.isSafeInteger(user.id) && env.ALLOWED_GITHUB_IDS.split(',').includes(String(user.id)),'Esta conta GitHub não está autorizada a acessar o Admin.',403);
    return redirect(`${env.ADMIN_ORIGIN}/admin/`,[cookie(FLOW,'',0),cookie(SESSION,await seal({sub:String(user.id)},env,'admin-session',3600),3600)]);
  }catch(error){
    const response=loginPage(error instanceof HttpError?error.message:'Não foi possível concluir o login. Tente novamente.',error instanceof HttpError?error.status:502);
    response.headers.append('Set-Cookie',cookie(FLOW,'',0));return response;
  }
}
