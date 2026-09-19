import sanitize from 'sanitize-html';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function assert(condition, message, status = 400) {
  if (!condition) throw new HttpError(status, message);
}
export function cleanHtml(html) {
  assert(typeof html === 'string' && html.length <= 200000, 'HTML inválido ou maior que 200 mil caracteres.');
  return sanitize(html, {
    allowedTags: ['p','h2','h3','h4','ul','ol','li','strong','b','em','i','a','blockquote','hr','br','figure','figcaption','img','table','thead','tbody','tr','th','td','div','span'],
    allowedAttributes: {a:['href','title','target','rel'],img:['src','alt','title','width','height','loading'],th:['scope','colspan','rowspan'],td:['colspan','rowspan']},
    allowedSchemes: ['https','http','mailto'],
    allowedSchemesByTag: {img:['https']},
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tagName, attrs) => ({tagName, attribs: {...attrs, rel:'noopener noreferrer', ...(attrs.target !== '_blank' ? {target:'_self'} : {})}}),
      img: (tagName, attrs) => ({tagName, attribs: {...attrs, loading:'lazy'}}),
    },
  });
}
const text = (v, name, max, required = false) => {
  assert(typeof v === 'string' && v.length <= max && (!required || v.trim()), `${name} inválido.`);
  return v.trim();
};
export function validateInput(input, publish = false) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'Dados inválidos.');
  const allowed = new Set(['id','expected','title','slug','description','categoryId','bodyHtml','thumbnailId','thumbnailAlt','isHomeFeatured','showInHighlights','isCienciaVital']);
  assert(Object.keys(input).every(k => allowed.has(k)), 'Campo não permitido.');
  assert(typeof input.id === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(input.id), 'Identificador inválido.');
  assert(input.expected && ['draftRevision','publishedRevision'].every(k => input.expected[k] === null || (typeof input.expected[k] === 'string' && /^[\w-]{1,128}$/.test(input.expected[k]))), 'Recarregue o artigo antes de salvar.');
  const title = text(input.title, 'Título', 250, true);
  const slug = text(input.slug, 'Slug', 96, true);
  assert(/^[a-z0-9][a-z0-9-]*$/.test(slug), 'Use apenas letras minúsculas, números e hífens no slug.');
  const description = text(input.description, 'Resumo', 300, publish);
  assert(typeof input.categoryId === 'string' && (!input.categoryId || /^[a-zA-Z0-9_-]{1,128}$/.test(input.categoryId)), 'Categoria inválida.');
  if (publish) assert(input.categoryId, 'Selecione uma categoria.');
  const bodyHtml = cleanHtml(input.bodyHtml);
  for (const key of ['isHomeFeatured','showInHighlights','isCienciaVital']) assert(typeof input[key] === 'boolean', 'Opção editorial inválida.');
  assert(typeof input.thumbnailId === 'string' && (!input.thumbnailId || /^image-[a-f0-9]+-\d+x\d+-(jpg|png|webp)$/.test(input.thumbnailId)), 'Capa inválida.');
  return {title, slug:{_type:'slug',current:slug}, description, bodyHtml,
    categories: input.categoryId ? [{_type:'reference',_key:'principal',_ref:input.categoryId}] : [],
    language:'pt-BR', isHomeFeatured:input.isHomeFeatured, showInHighlights:input.showInHighlights, isCienciaVital:input.isCienciaVital,
    ...(input.thumbnailId ? {thumbnail:{_type:'image',asset:{_type:'reference',_ref:input.thumbnailId},alt:text(input.thumbnailAlt,'Texto alternativo',500)}} : {}),
  };
}
