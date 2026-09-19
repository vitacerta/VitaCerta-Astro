import {EncryptJWT,jwtDecrypt,base64url} from 'jose';
import {assert,HttpError} from './errors.js';

const SESSION='__Host-vci-session';
const FLOW='__Host-vci-oauth';
const security={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow'};
const cookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const random=()=>base64url.encode(crypto.getRandomValues(new Uint8Array(32)));

function cookieValue(request,name){
  const matches=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));
  assert(matches.length<=1,'Sessão inválida.',401);
  return matches[0]?.slice(name.length+1);
}
function configured(env){
  assert(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&/^[0-9]+(?:,[0-9]+)*$/.test(env.ALLOWED_GITHUB_IDS||'')&&typeof env.SESSION_SECRET==='string'&&env.SESSION_SECRET.length>=32,'Login ainda não configurado.',503);
  assert(/^https:\/\//.test(env.INSIGHTS_ORIGIN||'')&&new URL(env.INSIGHTS_ORIGIN).origin===env.INSIGHTS_ORIGIN,'Endereço do Insights inválido.',503);
}
async function key(env){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.SESSION_SECRET)));}
async function seal(payload,env,audience,seconds){
  return new EncryptJWT(payload).setProtectedHeader({alg:'dir',enc:'A256GCM'}).setIssuedAt().setIssuer(env.INSIGHTS_ORIGIN).setAudience(audience).setExpirationTime(`${seconds}s`).encrypt(await key(env));
}
async function unseal(value,env,audience){
  assert(typeof value==='string'&&value.length<4096,'Entre novamente.',401);
  try{return (await jwtDecrypt(value,await key(env),{issuer:env.INSIGHTS_ORIGIN,audience,keyManagementAlgorithms:['dir'],contentEncryptionAlgorithms:['A256GCM'],requiredClaims:['iat','exp']})).payload;}
  catch{throw new HttpError(401,'Sessão inválida ou expirada.');}
}
function redirect(location,cookies=[]){
  const headers=new Headers({...security,Location:location});
  cookies.forEach(value=>headers.append('Set-Cookie',value));
  return new Response(null,{status:303,headers});
}
export async function authenticate(request,env){
  configured(env);
  const session=await unseal(cookieValue(request,SESSION),env,'insights-session');
  assert(typeof session.sub==='string'&&env.ALLOWED_GITHUB_IDS.split(',').includes(session.sub),'Acesso não autorizado.',403);
  return session;
}
export function loginPage(message='Entre com a conta VitaCerta para ver os resultados.',status=200){
  const safe=message.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Entrar | VitaCerta Insights</title><style>body{font:18px system-ui;background:#f2f5f2;color:#18372a;display:grid;min-height:90vh;place-items:center}main{max-width:430px;padding:34px;background:white;border-radius:16px;box-shadow:0 8px 30px #18372a18}a{display:inline-block;padding:12px 20px;background:#245b43;color:white;border-radius:9px;text-decoration:none}p{line-height:1.5}</style><main><h1>VitaCerta Insights</h1><p>${safe}</p><a href="/auth/login">Entrar com GitHub</a></main></html>`,{status,headers:{...security,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}});
}
export async function authRoute(request,env,fetcher=fetch){
  const url=new URL(request.url);
  if(url.pathname==='/auth/logout'){
    assert(request.method==='POST','Método não permitido.',405);
    assert(request.headers.get('Origin')===env.INSIGHTS_ORIGIN&&request.headers.get('X-VitaCerta-Insights')==='1','Origem não permitida.',403);
    return Response.json({ok:true},{headers:{...security,'Set-Cookie':cookie(SESSION,'',0)}});
  }
  assert(request.method==='GET','Método não permitido.',405);configured(env);
  if(url.pathname==='/auth/login'){
    const state=random(),verifier=random();
    const challenge=base64url.encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
    const params=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:`${env.INSIGHTS_ORIGIN}/auth/callback`,scope:'',state,code_challenge:challenge,code_challenge_method:'S256',allow_signup:'false'});
    return redirect(`https://github.com/login/oauth/authorize?${params}`,[cookie(FLOW,await seal({state,verifier},env,'oauth-flow',600),600)]);
  }
  assert(url.pathname==='/auth/callback','Página não encontrada.',404);
  try{
    assert(!url.searchParams.has('error'),'Login cancelado.',401);
    const flow=await unseal(cookieValue(request,FLOW),env,'oauth-flow');
    assert(flow.state===url.searchParams.get('state')&&typeof flow.verifier==='string','Solicitação inválida.',401);
    const code=url.searchParams.get('code');assert(code&&code.length<=256,'Código inválido.',401);
    const tokenResponse=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:`${env.INSIGHTS_ORIGIN}/auth/callback`,code_verifier:flow.verifier}),signal:AbortSignal.timeout(15000),redirect:'manual'});
    assert(tokenResponse.ok,'Falha no login GitHub.',502);
    const token=await tokenResponse.json();
    assert(typeof token.access_token==='string'&&!token.error,'O GitHub recusou a credencial do aplicativo.',401);
    assert(!token.scope||token.scope.trim()==='','Permissões excessivas no login.',403);
    const identity=await fetcher('https://api.github.com/user',{headers:{Authorization:`Bearer ${token.access_token}`,Accept:'application/vnd.github+json','User-Agent':'VitaCerta-Insights','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(15000),redirect:'manual'});
    assert(identity.ok,'Não foi possível confirmar sua identidade.',502);
    const user=await identity.json();
    assert(Number.isSafeInteger(user.id)&&env.ALLOWED_GITHUB_IDS.split(',').includes(String(user.id)),'Conta não autorizada.',403);
    return redirect(`${env.INSIGHTS_ORIGIN}/insights/`,[cookie(FLOW,'',0),cookie(SESSION,await seal({sub:String(user.id)},env,'insights-session',3600),3600)]);
  }catch(error){
    const response=loginPage(error instanceof HttpError?error.message:'Não foi possível entrar.',error instanceof HttpError?error.status:502);
    response.headers.append('Set-Cookie',cookie(FLOW,'',0));return response;
  }
}
