import test from 'node:test';
import assert from 'node:assert/strict';
import {createArticlePreviewHtml} from '../../../src/lib/admin-preview.js';

test('renders the complete article preview with sanitized metadata',()=>{
  const html=createArticlePreviewHtml({
    title:'Título <seguro>',
    description:'Resumo & contexto',
    category:'Saúde',
    date:'19/09/2026',
    coverUrl:'blob:https://example.com/capa',
    coverAlt:'Capa "principal"',
    bodyHtml:'<h2>Seção publicada</h2><p>Texto do artigo.</p>'
  });
  assert.match(html,/TÍTULO/i);
  assert.ok(html.includes('Título &lt;seguro&gt;'));
  assert.ok(html.includes('Resumo &amp; contexto'));
  assert.ok(html.includes('Saúde'));
  assert.ok(html.includes('19/09/2026'));
  assert.ok(html.includes('article-preview-cover'));
  assert.ok(html.includes('Capa &quot;principal&quot;'));
  assert.ok(html.includes('<h2>Seção publicada</h2><p>Texto do artigo.</p>'));
});

test('omits optional category and cover without breaking the body',()=>{
  const html=createArticlePreviewHtml({bodyHtml:'<p>Somente texto.</p>'});
  assert.ok(!html.includes('article-preview-category'));
  assert.ok(!html.includes('article-preview-cover'));
  assert.ok(html.includes('<p>Somente texto.</p>'));
});
