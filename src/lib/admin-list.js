import {api,categoryLabel} from './admin-api.js';
const el=id=>document.getElementById(id);
const numberFormat=new Intl.NumberFormat('pt-BR');
let articles=[];
let analytics={loading:true,configured:false,pageviews:{},from:'2026-09-21',updatedAt:null,error:null};

function articlePath(slug){
  return `/conteudos/${String(slug || '').replace(/^\/+|\/+$/g,'')}`;
}
function pageviewText(article){
  if(!article.slug) return '—';
  if(analytics.loading) return '…';
  if(analytics.error || !analytics.configured) return '—';
  return numberFormat.format(analytics.pageviews[articlePath(article.slug)] || 0);
}
function render(){
  const q=el('search').value.trim().toLowerCase();
  const selected=articles.filter(a=>(!q || `${a.title} ${a.slug}`.toLowerCase().includes(q)) && (!el('category').value || a.category===el('category').value) && (!el('status').value || a.status===el('status').value));
  el('articleRows').replaceChildren();
  for(const article of selected){
    const row=document.createElement('tr');
    const titleCell=document.createElement('td');
    const title=document.createElement('div');title.className='article-title';title.textContent=article.title || 'Sem título';titleCell.append(title);
    const slug=document.createElement('div');slug.className='slug';slug.textContent=`/${article.slug || 'sem-slug'}`;titleCell.append(slug);
    const flags=document.createElement('div');flags.className='flags';
    for(const [key,label] of [['isHomeFeatured','Home'],['showInHighlights','Em Destaque'],['isCienciaVital','Ciência Vital']])if(article[key]){const flag=document.createElement('span');flag.className='flag';flag.textContent=label;flags.append(flag);}
    titleCell.append(flags);row.append(titleCell);
    for(const text of [categoryLabel(article.category),article.status==='draft'?'Rascunho':'Publicado',article._updatedAt ? new Date(article._updatedAt).toLocaleDateString('pt-BR') : '—']){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}
    const viewsCell=document.createElement('td');viewsCell.className='views';viewsCell.textContent=pageviewText(article);
    viewsCell.title=analytics.configured ? `Visualizações desde ${new Date(`${analytics.from}T12:00:00`).toLocaleDateString('pt-BR')}` : 'Visualizações temporariamente indisponíveis';
    row.append(viewsCell);
    const cell=document.createElement('td');const link=document.createElement('a');link.className='link';link.href=`/admin/novo/?id=${encodeURIComponent(article.id)}`;link.textContent='Editar';cell.append(link);row.append(cell);el('articleRows').append(row);
  }
  el('visibleCount').textContent=String(selected.length);el('emptyState').style.display=selected.length?'none':'block';
}
function analyticsNote(){
  if(analytics.loading) return 'Carregando visualizações…';
  if(analytics.error) return 'Artigos carregados. As visualizações estão temporariamente indisponíveis.';
  if(!analytics.configured) return 'Artigos carregados. A leitura de visualizações aguarda a configuração protegida da Cloudflare.';
  const date=new Date(`${analytics.from}T12:00:00`).toLocaleDateString('pt-BR');
  const updated=analytics.updatedAt ? new Date(analytics.updatedAt).toLocaleString('pt-BR') : 'agora';
  return `Visualizações acumuladas desde ${date}. Dados consultados em ${updated}.`;
}
for(const id of ['search','category','status'])el(id).addEventListener('input',render);
document.getElementById('logout').addEventListener('click',async()=>{
  const response=await fetch('/auth/logout',{method:'POST',credentials:'same-origin',headers:{'X-VitaCerta-Admin':'1'}});
  if(response.ok)location.assign('/admin/');else document.querySelector('.note').textContent='Não foi possível sair. Tente novamente.';
});

const [articlesResult,analyticsResult]=await Promise.allSettled([api('articles'),api('article-pageviews')]);
if(articlesResult.status==='rejected'){
  el('dataNote').textContent=articlesResult.reason.message;
}else{
  articles=articlesResult.value;
  for(const cat of [...new Set(articles.map(x=>x.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))){const option=document.createElement('option');option.value=cat;option.textContent=categoryLabel(cat);el('category').append(option);}
}
if(analyticsResult.status==='fulfilled'){
  analytics={loading:false,error:null,...analyticsResult.value};
}else{
  analytics={...analytics,loading:false,error:analyticsResult.reason};
}
render();
el('dataNote').textContent=articlesResult.status==='fulfilled' ? analyticsNote() : articlesResult.reason.message;
