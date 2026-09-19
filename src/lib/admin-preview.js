const escapeHtml = (value = '') => String(value)
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&#39;');

export function createArticlePreviewHtml({
  title = '',
  description = '',
  category = '',
  date = '',
  coverUrl = '',
  coverAlt = '',
  bodyHtml = ''
} = {}) {
  const safeTitle=escapeHtml(title || 'Título do artigo');
  const safeDescription=escapeHtml(description);
  const safeCategory=escapeHtml(category);
  const safeDate=escapeHtml(date);
  const safeCoverUrl=escapeHtml(coverUrl);
  const safeCoverAlt=escapeHtml(coverAlt || title || 'Capa do artigo');
  const categoryHtml=safeCategory ? `<span class="article-preview-category">${safeCategory}</span>` : '';
  const coverHtml=safeCoverUrl ? `<img class="article-preview-cover" src="${safeCoverUrl}" alt="${safeCoverAlt}">` : '';
  const content=bodyHtml || '<p class="empty-preview">O artigo ainda não possui conteúdo.</p>';
  return `<div class="article-preview-header"><h1>${safeTitle}</h1><p class="article-preview-description">${safeDescription}</p></div><div class="article-preview-meta"><p><b>Data</b> ${safeDate}</p>${categoryHtml}</div>${coverHtml}<div class="article-preview-body post">${content}</div>`;
}
