import {authenticate,authRoute,loginPage} from './auth.js';
import {getCloudflareMetrics} from './cloudflare.js';
import {HttpError} from './errors.js';

const security={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow'};
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>VitaCerta Insights</title><style>
:root{font-family:Inter,system-ui,sans-serif;color:#173428;background:#f4f6f3}*{box-sizing:border-box}body{margin:0}header{background:#173f30;color:white;padding:22px max(5vw,24px);display:flex;justify-content:space-between;align-items:center}header h1{margin:0;font-size:24px}nav{display:flex;gap:18px;align-items:center}a{color:inherit}.wrap{max-width:1120px;margin:auto;padding:38px 24px}.eyebrow{color:#527060;font-weight:700}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin:24px 0}.card,section{background:white;border:1px solid #dfe6e1;border-radius:14px;padding:22px}.value{font-size:36px;font-weight:800;margin:8px 0}.muted{color:#617268}.grid{display:grid;grid-template-columns:2fr 1fr;gap:18px}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:12px 8px;border-bottom:1px solid #e5e9e6}th:last-child,td:last-child{text-align:right}.status{padding:14px;border-radius:9px;background:#fff7da;color:#654f00}button{border:0;background:transparent;color:white;text-decoration:underline;cursor:pointer;font:inherit}@media(max-width:760px){.grid{grid-template-columns:1fr}}
</style></head><body><header><h1>VitaCerta Insights</h1><nav><a href="https://vitacerta-admin-api.blc-comarela.workers.dev/admin/">Admin Editorial</a><button id="logout">Sair</button></nav></header><main class="wrap"><div class="eyebrow">ACESSOS E SEO</div><h2>Visão geral dos últimos 28 dias</h2><div id="status" class="status">Carregando dados…</div><div class="cards"><div class="card"><div>Visitas</div><div class="value" id="visits">—</div><div class="muted" id="visitsChange"></div></div><div class="card"><div>Requisições</div><div class="value" id="requests">—</div><div class="muted" id="requestsChange"></div></div><div class="card"><div>Cliques do Google</div><div class="value">—</div><div class="muted">Search Console será conectado na V2</div></div></div><div class="grid"><section><h3>Páginas mais acessadas</h3><table><thead><tr><th>Página</th><th>Acessos</th></tr></thead><tbody id="pages"><tr><td colspan="2">Aguardando dados</td></tr></tbody></table></section><section><h3>Próximo passo</h3><p>Conectar o Google Search Console para mostrar pesquisas, impressões, cliques e oportunidades de conteúdo.</p></section></div></main><script>
const fmt=n=>new Intl.NumberFormat('pt-BR').format(n||0);
const change=(now,before)=>before?(((now-before)/before)*100).toFixed(1).replace('.',',')+'% versus período anterior':'Sem comparação anterior';
async function load(){const r=await fetch('/api/metrics');if(r.status===401){location.href='/';return}const d=await r.json();const status=document.querySelector('#status');if(!r.ok||!d.configured){status.textContent=d.message||d.reason||'Dados ainda não conectados.';return}status.hidden=true;visits.textContent=fmt(d.visits);requests.textContent=fmt(d.requests);visitsChange.textContent=change(d.visits,d.previousVisits);requestsChange.textContent=change(d.requests,d.previousRequests);pages.innerHTML=d.topPages.length?d.topPages.map(x=>'<tr><td>'+escapeHtml(x.path)+'</td><td>'+fmt(x.requests)+'</td></tr>').join(''):'<tr><td colspan="2">Nenhum acesso encontrado</td></tr>'}function escapeHtml(v){const e=document.createElement('span');e.textContent=v;return e.innerHTML}logout.onclick=async()=>{await fetch('/auth/logout',{method:'POST',headers:{'X-VitaCerta-Insights':'1'}});location.href='/'};load();
</script></body></html>`;

export function createHandler(deps={metrics:getCloudflareMetrics}){
  return async function(request,env){
    const url=new URL(request.url);
    try{
      if(url.pathname.startsWith('/auth/'))return await authRoute(request,env);
      if(url.pathname==='/')return new Response(null,{status:303,headers:{...security,Location:'/insights/'}});
      if(url.pathname==='/insights/'||url.pathname==='/api/metrics'){
        try{await authenticate(request,env);}catch(error){if(url.pathname==='/insights/'&&error instanceof HttpError&&error.status===401)return loginPage();throw error;}
        if(url.pathname==='/api/metrics'){
          const data=await deps.metrics(env);return Response.json(data,{headers:{...security,'Cache-Control':'private, max-age=300'}});
        }
        return new Response(html,{headers:{...security,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}});
      }
      throw new HttpError(404,'Página não encontrada.');
    }catch(error){
      const status=error instanceof HttpError?error.status:500;
      return Response.json({message:error instanceof HttpError?error.message:'Erro interno.'},{status,headers:security});
    }
  };
}
export default {fetch:createHandler()};
