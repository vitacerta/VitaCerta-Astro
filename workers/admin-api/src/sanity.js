import {assert, HttpError, validateInput} from './validation.js';
export function sanity(env, fetcher = fetch) {
  assert(/^[a-z0-9]+$/.test(env.SANITY_PROJECT_ID || '') && /^[a-z0-9_-]+$/.test(env.SANITY_DATASET || '') && env.SANITY_WRITE_TOKEN, 'Sanity ainda não configurado.', 503);
  const base = `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2025-02-19`;
  const call = async (path, init) => {
    const response = await fetcher(`${base}${path}`, {...init,headers:{Authorization:`Bearer ${env.SANITY_WRITE_TOKEN}`,...init?.headers},signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw new HttpError(response.status === 409 ? 409 : 502, response.status === 409 ? 'O artigo foi alterado em outra sessão. Recarregue antes de salvar.' : 'Não foi possível concluir a operação no Sanity.');
    return response.json();
  };
  return {
    query: async (query, params = {}) => {
      const search = new URLSearchParams({query,perspective:'raw'});
      for (const [k,v] of Object.entries(params)) search.set(`$${k}`, JSON.stringify(v));
      return (await call(`/data/query/${env.SANITY_DATASET}?${search}`)).result;
    },
    mutate: mutations => call(`/data/mutate/${env.SANITY_DATASET}?visibility=sync&returnIds=true`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mutations})}),
    upload: (body, type) => call(`/assets/images/${env.SANITY_DATASET}`, {method:'POST',headers:{'Content-Type':type},body}),
  };
}
export const revisions = (draft, published) => ({draftRevision:draft?._rev || null,publishedRevision:published?._rev || null});
export async function readArticle(api, id) {
  const docs = await api.query('*[_id in $ids]', {ids:[id,`drafts.${id}`]});
  const published = docs.find(x => x._id === id);
  const draft = docs.find(x => x._id === `drafts.${id}`);
  assert(docs.every(x => x._type === 'post'), 'Identificador reservado.', 409);
  return {draft,published,expected:revisions(draft,published)};
}
function guard(doc) { return {patch:{id:doc._id,ifRevisionID:doc._rev,set:{language:doc.language || 'pt-BR'}}}; }
export async function saveArticle(api, input, publish, now = new Date().toISOString()) {
  const fields = validateInput(input, publish);
  const articleLockId = `adminArticle.${input.id}`;
  const articleLock = await api.query('*[_id == $id][0]',{id:articleLockId});
  const {draft,published,expected} = await readArticle(api,input.id);
  assert(Object.keys(expected).every(k => expected[k] === input.expected[k]), 'O artigo mudou. Recarregue antes de salvar.', 409);
  assert(!published || published.slug?.current === fields.slug.current, 'O slug de um artigo publicado deve permanecer estável.', 409);
  if (!published) assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.slug.current), 'Remova hífens repetidos ou no final do novo slug.');
  if (draft?.adminBasePublishedRevision !== undefined) assert(draft.adminBasePublishedRevision === (published?._rev || null), 'A publicação mudou após este rascunho. Revise no Studio antes de continuar.',409);
  if (input.categoryId) assert(await api.query('count(*[_type == "category" && _id == $id])', {id:input.categoryId}) === 1,'Categoria não encontrada.');
  if (input.thumbnailId) {
    const asset = await api.query('*[_type == "sanity.imageAsset" && _id == $id][0]{metadata}', {id:input.thumbnailId});
    assert(asset, 'Imagem não encontrada.');
    if (publish) assert(Math.abs((asset.metadata?.dimensions?.aspectRatio || 0) - 16/9) < 0.06, 'A capa deve ter proporção 16:9.');
  }
  const base = draft || published || {};
  if (publish) {
    assert(fields.bodyHtml.replace(/<[^>]*>/g,'').trim() || base.body?.length || base.legacyBodyHtml, 'Adicione o conteúdo do artigo.');
    assert(fields.thumbnail || base.thumbnail?.asset || base.mainImage?.asset || base.coverUrl, 'Adicione a imagem de capa.');
  }
  const conflicts = await api.query('count(*[_type == "post" && slug.current == $slug && !(_id in $ids)])', {slug:fields.slug.current,ids:[input.id,`drafts.${input.id}`]});
  assert(conflicts === 0, 'Este slug já está em uso.',409);
  // A deterministic reservation makes concurrent Admin requests for the same slug conflict atomically.
  const lockId = `adminSlug.${fields.slug.current}`;
  const lock = await api.query('*[_id == $id][0]',{id:lockId});
  assert(!lock || lock.owner === input.id,'Este slug está reservado para outro artigo.',409);
  const mutations = [
    articleLock ? {patch:{id:articleLockId,ifRevisionID:articleLock._rev,set:{touchedAt:now}}} : {create:{_id:articleLockId,_type:'adminArticle',touchedAt:now}},
    lock ? {patch:{id:lockId,ifRevisionID:lock._rev,set:{owner:input.id}}} : {create:{_id:lockId,_type:'adminSlug',owner:input.id}},
  ];
  const document = Object.fromEntries(Object.entries(base).filter(([k]) => !k.startsWith('_') && k !== 'adminBasePublishedRevision'));
  Object.assign(document,fields,{_id:publish ? input.id : `drafts.${input.id}`,_type:'post'});
  if (published?.publishedAt) document.publishedAt = published.publishedAt;
  else if (publish) document.publishedAt = now;
  else delete document.publishedAt;
  if (!publish) document.adminBasePublishedRevision = published?._rev || null;
  if (publish && fields.isHomeFeatured) {
    const homeLock = await api.query('*[_id == "adminState.home"][0]');
    mutations.push(homeLock ? {patch:{id:homeLock._id,ifRevisionID:homeLock._rev,set:{owner:input.id}}} : {create:{_id:'adminState.home',_type:'adminState',owner:input.id}});
    const featured = await api.query('*[_type == "post" && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && isHomeFeatured == true && _id != $id]',{id:input.id});
    for (const other of featured) mutations.push({patch:{id:other._id,ifRevisionID:other._rev,set:{isHomeFeatured:false}}});
  }
  if (published) mutations.push(guard(published));
  if (draft) mutations.push(guard(draft));
  mutations.push((publish ? published : draft) ? {createOrReplace:document} : {create:document});
  if (publish && draft) mutations.push({delete:{id:draft._id}});
  await api.mutate(mutations);
  const saved = await readArticle(api,input.id);
  return {id:input.id,expected:saved.expected,status:publish?'published':'draft'};
}

function validateAction(input) {
  assert(input && typeof input === 'object' && /^[a-zA-Z0-9_-]{1,120}$/.test(input.id || ''), 'Identificador inválido.');
  assert(input.expected && Object.keys(input.expected).length === 2 && ['draftRevision','publishedRevision'].every(key => input.expected[key] === null || typeof input.expected[key] === 'string'), 'Revisões inválidas.');
}

export async function unpublishArticle(api, input) {
  validateAction(input);
  const {draft,published,expected}=await readArticle(api,input.id);
  assert(published,'O artigo já não está publicado.',409);
  assert(Object.keys(expected).every(key => expected[key] === input.expected[key]),'O artigo mudou. Recarregue antes de despublicar.',409);
  const mutations=[guard(published)];
  if (draft) mutations.push(guard(draft));
  else {
    const document=Object.fromEntries(Object.entries(published).filter(([key])=>!key.startsWith('_')));
    delete document.publishedAt;
    document._id=`drafts.${input.id}`;
    document._type='post';
    document.adminBasePublishedRevision=null;
    mutations.push({create:document});
  }
  mutations.push({delete:{id:published._id}});
  await api.mutate(mutations);
  const saved=await readArticle(api,input.id);
  return {id:input.id,expected:saved.expected,status:'draft'};
}

export async function deleteArticle(api, input) {
  validateAction(input);
  const {draft,published,expected}=await readArticle(api,input.id);
  assert(draft || published,'Artigo não encontrado.',404);
  assert(Object.keys(expected).every(key => expected[key] === input.expected[key]),'O artigo mudou. Recarregue antes de excluir.',409);
  const mutations=[];
  if (published) mutations.push(guard(published));
  if (draft) mutations.push(guard(draft));
  if (published) mutations.push({delete:{id:published._id}});
  if (draft) mutations.push({delete:{id:draft._id}});
  const articleLock=await api.query('*[_id == $id][0]',{id:`adminArticle.${input.id}`});
  if (articleLock) mutations.push({delete:{id:articleLock._id}});
  const slug=draft?.slug?.current || published?.slug?.current;
  if (slug) {
    const slugLock=await api.query('*[_id == $id][0]',{id:`adminSlug.${slug}`});
    if (slugLock?.owner === input.id) mutations.push({delete:{id:slugLock._id}});
  }
  await api.mutate(mutations);
  return {id:input.id,status:'deleted'};
}

