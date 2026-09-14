import {api,categoryLabel} from './admin-api.js';
const el=id=>document.getElementById(id);
let articles=[];
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
    const cell=document.createElement('td');const link=document.createElement('a');link.className='link';link.href=`/admin/novo/?id=${encodeURIComponent(article.id)}`;link.textContent='Editar';cell.append(link);row.append(cell);el('articleRows').append(row);
  }
  el('visibleCount').textContent=String(selected.length);el('emptyState').style.display=selected.length?'none':'block';
}
for(const id of ['search','category','status'])el(id).addEventListener('input',render);
document.getElementById('logout').addEventListener('click',()=>location.assign('/cdn-cgi/access/logout'));
api('articles').then(data=>{articles=data;for(const cat of [...new Set(data.map(x=>x.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))){const option=document.createElement('option');option.value=cat;option.textContent=categoryLabel(cat);el('category').append(option);}render();document.querySelector('.note').textContent='Conteúdo atualizado do Sanity.';}).catch(error=>{document.querySelector('.note').textContent=error.message;});
