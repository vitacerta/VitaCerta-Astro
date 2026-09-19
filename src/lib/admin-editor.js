import {api,categoryLabel} from './admin-api.js';
const el = id => document.getElementById(id);
let id = new URLSearchParams(location.search).get('id') || crypto.randomUUID();
let expected={draftRevision:null,publishedRevision:null};
let thumbnailId='', coverUrl='', slugTouched=false, ready=false, busy=false, uploadedFile;
let published=false;
const message = text => { el('message').textContent=text; el('message').classList.add('show'); };
const slugify = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,96);
const controls = () => {for (const name of ['saveDraft','publish','unpublish','deleteArticle']) el(name).disabled=!ready || busy;};
el('title').addEventListener('input',()=>{if(!slugTouched) el('slug').value=slugify(el('title').value);});
el('slug').addEventListener('input',()=>{slugTouched=true;});
el('description').addEventListener('input',()=>{el('descriptionCount').textContent=String(el('description').value.length);});
el('cover').addEventListener('change',()=>{if(coverUrl.startsWith('blob:')) URL.revokeObjectURL(coverUrl);coverUrl=el('cover').files[0] ? URL.createObjectURL(el('cover').files[0]) : '';});
function showHtml(){el('htmlPanel').style.display='block';el('previewPanel').classList.remove('active');el('htmlTab').classList.add('active');el('previewTab').classList.remove('active');}
async function preview(){
  if(busy)return;busy=true;controls();
  try {
    const {bodyHtml}=await api('preview',{bodyHtml:el('htmlContent').value});
    const frame=el('previewFrame');frame.replaceChildren();
    const header=document.createElement('div');header.className='article-preview-header';
    const title=document.createElement('h1');title.textContent=el('title').value || 'Título do artigo';
    const description=document.createElement('p');description.className='article-preview-description';description.textContent=el('description').value || '';
    header.append(title,description);frame.append(header);
    const meta=document.createElement('div');meta.className='article-preview-meta';
    const date=document.createElement('p');date.innerHTML='<b>Data</b> ';date.append(new Intl.DateTimeFormat('pt-BR').format(new Date()));meta.append(date);
    if(el('category').value){const category=document.createElement('span');category.className='article-preview-category';category.textContent=el('category').selectedOptions[0]?.textContent || '';meta.append(category);}
    frame.append(meta);
    if(coverUrl){const image=document.createElement('img');image.className='article-preview-cover';image.src=coverUrl;image.alt=el('coverAlt').value || el('title').value || 'Capa do artigo';frame.append(image);}
    const content=document.createElement('div');content.className='article-preview-body post';content.innerHTML=bodyHtml || '<p class="empty-preview">O artigo ainda não possui conteúdo.</p>';frame.append(content);
    el('htmlPanel').style.display='none';el('previewPanel').classList.add('active');el('htmlTab').classList.remove('active');el('previewTab').classList.add('active');
    message('Prévia exibida como no site. Nada foi salvo ou publicado.');
  }catch(error){message(error.message);}finally{busy=false;controls();}
}
async function save(publish){
  if(!ready || busy)return;
  if(publish && !confirm('Publicar este artigo no Sanity e iniciar a atualização do site?'))return;
  busy=true;controls();
  try {
    const file=el('cover').files[0];
    if(file && file !== uploadedFile){
      if(file.size>5*1024*1024)throw new Error('A capa deve ter no máximo 5 MB.');
      const asset=await api('images',file,file.type);thumbnailId=asset.id;uploadedFile=file;
    }
    const input={id,expected,title:el('title').value,slug:el('slug').value,description:el('description').value,categoryId:el('category').value,bodyHtml:el('htmlContent').value,thumbnailId,thumbnailAlt:el('coverAlt').value,isHomeFeatured:el('homeFeatured').checked,showInHighlights:el('highlights').checked,isCienciaVital:el('cienciaVital').checked};
    const result=await api(publish?'publish':'draft',input); expected=result.expected;
    published=publish || published;
    history.replaceState(null,'',`?id=${encodeURIComponent(id)}`);
    if(publish){slugTouched=true;el('slug').readOnly=true;}
    el('unpublish').hidden=!published;el('deleteArticle').hidden=false;
    el('editorStatus').textContent=publish?'Publicado no Sanity':'Rascunho salvo';
    message(publish?'Publicado no Sanity. A atualização do site depende da conclusão do GitHub Actions.':'Rascunho salvo no Sanity. O artigo não foi publicado.');
  }catch(error){message(error.message);}finally{busy=false;controls();}
}
async function stateAction(action){
  if(!ready || busy)return;
  const label=action==='unpublish'?'Despublicar este artigo e removê-lo do site? O conteúdo será mantido como rascunho.':'Excluir definitivamente este artigo do Sanity? A imagem enviada não será apagada.';
  if(!confirm(label))return;
  busy=true;controls();
  try{
    const result=await api(action,{id,expected});
    if(action==='delete'){location.href='/admin/';return;}
    expected=result.expected;published=false;el('slug').readOnly=false;el('editorStatus').textContent='Rascunho salvo';el('unpublish').hidden=true;
    message('Artigo despublicado. O conteúdo permanece como rascunho; a remoção do site depende da conclusão do GitHub Actions.');
  }catch(error){message(error.message);}finally{busy=false;controls();}
}
el('htmlTab').addEventListener('click',showHtml);
el('previewTab').addEventListener('click',preview);
el('visualizeSide').addEventListener('click',preview);
el('saveDraft').addEventListener('click',()=>save(false));
el('publish').addEventListener('click',()=>save(true));
el('unpublish').addEventListener('click',()=>stateAction('unpublish'));
el('deleteArticle').addEventListener('click',()=>stateAction('delete'));
async function init(){
  try {
    const [session,categories]=await Promise.all([api('session'),api('categories')]);
    for(const category of categories){const option=document.createElement('option');option.value=category._id;option.textContent=categoryLabel(category.slug);el('category').append(option);}
    if(new URLSearchParams(location.search).has('id')){
      const {document:doc,expected:rev,published:isPublished,coverPreviewUrl}=await api(`article?id=${encodeURIComponent(id)}`);expected=rev;published=isPublished;
      el('title').value=doc.title || '';el('slug').value=doc.slug?.current || '';el('description').value=doc.description || '';el('descriptionCount').textContent=String(el('description').value.length);
      el('category').value=doc.categories?.[0]?._ref || '';el('htmlContent').value=doc.bodyHtml || '';
      thumbnailId=doc.thumbnail?.asset?._ref || '';el('coverAlt').value=doc.thumbnail?.alt || '';
      coverUrl=coverPreviewUrl || '';slugTouched=true;el('slug').readOnly=published;
      el('homeFeatured').checked=!!doc.isHomeFeatured;el('highlights').checked=!!doc.showInHighlights;el('cienciaVital').checked=!!doc.isCienciaVital;
      document.querySelector('h1').textContent='Editar artigo';el('editorStatus').textContent=doc._id.startsWith('drafts.')?'Rascunho salvo':'Publicado';
      el('unpublish').hidden=!published;el('deleteArticle').hidden=false;
      if(!doc.bodyHtml && (doc.body?.length || doc.legacyBodyHtml)) message('O conteúdo anterior será preservado. Para substituí-lo, cole o novo HTML; a prévia mostra apenas esse novo HTML.');
    }
    ready=session.writesEnabled;controls();
    if(!ready)message('Leitura e prévia disponíveis. A gravação ainda não foi habilitada.');
  }catch(error){message(error.message);}
}
init();

