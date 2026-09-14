import {createRemoteJWKSet, jwtVerify} from 'jose';
import {assert, HttpError} from './validation.js';
const keys = new Map();
export async function authenticate(request, env) {
  assert(/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN || '') && env.ACCESS_AUD && env.ADMIN_EMAILS, 'Autenticação ainda não configurada.', 503);
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  assert(token, 'Entre novamente para acessar o Admin.', 401);
  if (!keys.has(env.ACCESS_TEAM_DOMAIN)) keys.set(env.ACCESS_TEAM_DOMAIN, createRemoteJWKSet(new URL(`${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`)));
  return verifyAccessToken(token,env,keys.get(env.ACCESS_TEAM_DOMAIN));
}
export async function verifyAccessToken(token, env, key) {
  try {
    const {payload} = await jwtVerify(token, key, {issuer:env.ACCESS_TEAM_DOMAIN,audience:env.ACCESS_AUD,algorithms:['RS256'],requiredClaims:['sub','iat','exp','email']});
    const editors = env.ADMIN_EMAILS.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    assert(typeof payload.email === 'string' && editors.includes(payload.email.toLowerCase()), 'Acesso não autorizado.', 403);
    return payload;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'Sessão inválida ou expirada. Entre novamente.');
  }
}
