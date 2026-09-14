# VitaCerta — Blueprint Mestre de Reconstrução

> Documento operacional para reconstruir ou clonar a arquitetura do VitaCerta sem depender do histórico de conversas, memória de uma IA ou conhecimento informal.

## 1. Objetivo

Este Blueprint é parte do kit de reconstrução do VitaCerta. Ele não é um prompt genérico. Deve ser usado em conjunto com o código versionado deste repositório e os documentos da pasta `docs/`.

Critério de sucesso: uma equipe ou uma nova sessão de IA deve conseguir compreender a arquitetura, criar uma nova instalação e adaptar marca/conteúdo sem precisar redescobrir as decisões fundamentais do projeto.

## 2. Fonte de verdade

- Código e configuração executável: este repositório GitHub.
- Conteúdo editorial atual: Sanity, dataset de produção.
- Blueprint: explica arquitetura, decisões e procedimento de reconstrução.
- Credenciais: nunca ficam no Blueprint ou no repositório. São recriadas como secrets/variáveis de ambiente.
- Arquivos históricos de migração: registros da migração; não são a verdade atual do conteúdo publicado.

## 3. Arquitetura atual

Fluxo público:

`Sanity → GitHub Actions → Astro build → GitHub Pages → vitacerta.com.br`

Fluxo editorial planejado/implementado no Admin MVP:

`Admin VitaCerta → camada autenticada/Cloudflare Worker → Sanity → webhook → GitHub Actions → Astro → site público`

Componentes:

- Frontend: Astro.
- CMS e fonte editorial: Sanity.
- Versionamento e automação: GitHub + GitHub Actions.
- Hospedagem pública: GitHub Pages.
- Domínio: `vitacerta.com.br`.
- Camada segura do Admin: Cloudflare Worker (em implantação).
- Admin customizado: em desenvolvimento na branch `admin-mvp`.

## 4. Repositório

Repositório principal: `vitacerta/VitaCerta-Astro`.

Arquivos/diretórios críticos a preservar e revisar em qualquer clone:

- `src/` — frontend Astro.
- `src/pages/conteudos/[...slug].astro` — renderização de artigo.
- `src/pages/admin/` — Admin VitaCerta MVP.
- `src/lib/sanity.*` — cliente/integração de leitura com Sanity.
- `cms/` — Sanity Studio e schemas locais.
- `cms/schemaTypes/post.ts` — modelo editorial principal.
- `.github/workflows/` — CI, preview e publicação.
- `migration/` — snapshots históricos da migração; não usar como restrição do conteúdo atual.
- `docs/` — documentação operacional e ADRs.

## 5. Sanity

Projeto VitaCerta atual:

- Project ID: `1dh7sg5j`.
- Dataset: `production`.

O Sanity é a fonte oficial dos artigos. Artigos migrados e artigos novos pertencem ao mesmo histórico editorial e podem ser editados, despublicados ou removidos conforme decisão editorial.

### Conteúdo do artigo

Compatibilidade planejada:

1. `bodyHtml` — HTML editorial produzido pelo Admin novo.
2. `body` — conteúdo estruturado Portable Text/Sanity.
3. `legacyBodyHtml` — HTML preservado da migração.

O frontend deve manter fallback entre formatos para preservar os artigos existentes.

### Campos editoriais relevantes

- `title`
- `description`
- `slug`
- `categories` (uma categoria principal)
- `thumbnail`
- `publishedAt`
- `editoriallyUpdatedAt`
- `bodyHtml`
- `body`
- `legacyBodyHtml`
- `isHomeFeatured`
- `showInHighlights`
- `isCienciaVital`
- `language` (`pt-BR` no projeto atual)

Campos legados devem ser preservados enquanto houver conteúdo dependente deles.

## 6. Regras editoriais importantes

- `isHomeFeatured`: identifica o destaque principal da Home. Objetivo final: apenas um artigo ativo.
- `showInHighlights`: faixa de destaques; frontend limita a exibição a até 5.
- `isCienciaVital`: identifica artigos da série Ciência Vital sem substituir a categoria principal.
- Preview do Admin não deve salvar, publicar nem disparar GitHub.
- Publicar no Admin deve gravar no Sanity; a cadeia automática cuida do deploy.
- Agendamento de publicação está deliberadamente fora do MVP atual.

## 7. Admin VitaCerta — MVP

Objetivo: camada simples para operação editorial cotidiana, sem tentar recriar todo o Sanity Studio.

Telas/funções definidas:

- Lista de artigos.
- Busca por título/slug.
- Filtros de categoria/status.
- Novo artigo.
- Edição posterior de artigo.
- Título, slug, descrição, categoria, capa e conteúdo.
- Conteúdo produzido por colagem de HTML.
- Fluxo `HTML → Visualizar → voltar/corrigir → Salvar rascunho ou Publicar`.
- Flags Home, Em Destaque e Ciência Vital.
- Futuramente: editar, publicar/despublicar e excluir.

O HTML deve ser sanitizado. Não permitir scripts, handlers (`onclick` etc.), URLs `javascript:` ou código executável arbitrário.

## 8. Segurança

Princípios obrigatórios:

- Nunca colocar token de escrita do Sanity no JavaScript enviado ao navegador.
- Nunca versionar PATs, tokens, senhas ou chaves.
- Escritas do Admin passam por endpoint server-side autenticado.
- Segredos do Worker ficam como Secrets/variáveis protegidas do Cloudflare.
- O painel Admin deve ser protegido por autenticação antes de habilitar escrita pública.
- O Sanity Studio original permanece como painel técnico/emergencial.

## 9. Automação de publicação

O projeto usa GitHub Actions para build/deploy. O webhook do Sanity dispara `repository_dispatch` com evento `sanity-publish` para o repositório.

A validação não deve exigir uma contagem fixa de artigos. O antigo número 86 é apenas o tamanho da migração histórica e não pode impedir o 87º, 88º etc.

Os workflows devem validar o conteúdo corrente e a geração real de páginas.

## 10. Identidade visual

A identidade visual atual do VitaCerta deve ser preservada durante a implantação técnica do Admin. Não redesenhar o site incidentalmente.

Ao clonar para outro projeto, identidade visual, marca, domínio e conteúdo são parâmetros substituíveis; arquitetura e contratos técnicos podem ser reutilizados.

## 11. Clone para novo projeto

Ao criar um novo projeto com esta base:

Preservar como modelo:

- arquitetura Astro + Sanity + GitHub Actions;
- separação CMS/Admin/site público;
- estratégia de preview;
- publicação por webhook;
- segurança server-side;
- organização dos schemas e conteúdo;
- validações dinâmicas sem contagem fixa.

Substituir obrigatoriamente:

- nome e identidade da marca;
- domínio;
- repositório GitHub;
- projeto/dataset Sanity;
- IDs e URLs de serviços;
- tokens/secrets;
- categorias e regras editoriais específicas quando o novo produto exigir;
- textos legais, SEO e conteúdo.

## 12. Variáveis e secrets

Este repositório deve manter um arquivo de exemplo sem valores secretos. Nomes exatos devem ser atualizados conforme a implementação final do Worker/Admin.

Exemplos conceituais:

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_WRITE_TOKEN`
- origem permitida do Admin
- demais credenciais de integração necessárias

Valores reais nunca entram neste documento.

## 13. ADR — decisões arquiteturais

Decisões importantes devem ser registradas em `docs/adr/` no formato Architecture Decision Record: contexto, decisão, consequências e status.

ADRs iniciais recomendados:

- Sanity como fonte editorial oficial.
- Astro/GitHub Pages como camada pública.
- Admin customizado como camada de operação, sem substituir a fonte de verdade.
- Cloudflare Worker para escrita segura.
- HTML editorial novo com compatibilidade para conteúdo legado.
- Validação dinâmica de conteúdo, sem quantidade fixa de posts.

## 14. Checklist de restauração

Uma reconstrução só deve ser considerada comprovada quando for possível:

1. criar novo repositório/ambiente;
2. instalar dependências;
3. criar/configurar projeto Sanity;
4. aplicar schemas;
5. configurar variáveis não secretas;
6. criar secrets separadamente;
7. executar build local/CI;
8. gerar páginas de conteúdo;
9. configurar domínio/hospedagem;
10. configurar webhook de publicação;
11. proteger Admin;
12. criar um artigo de teste;
13. visualizar sem publicar;
14. publicar e confirmar Sanity → GitHub → site;
15. editar/despublicar e validar o ciclo completo.

## 15. Teste de reconstrução

Antes de declarar o Blueprint final, realizar um teste de restauração em ambiente novo ou simulado usando apenas:

- este Blueprint;
- `docs/`;
- repositório;
- credenciais novas fornecidas/configuradas no ambiente.

Não usar conhecimento de conversas anteriores como requisito oculto. Toda informação necessária que não seja segredo deve estar versionada.

## 16. Estado deste documento

### Atualização do Admin — 13/09/2026

A camada do novo Worker `vitacerta-admin-api` foi implementada em desenvolvimento, com login GitHub no próprio Worker, sanitização server-side, categorias reais, rascunho, preview sem gravação, publicação e edição com revisão. O Admin e sua API usam a mesma origem protegida. O Worker de imagens permanece separado.

Testes locais, teste de navegador com dados fictícios, build Astro e compilação simulada da primeira revisão foram executados. A revisão com GitHub Login passou em 17 testes locais; o build desta revisão deve ser conferido no CI. **Isso não comprova implantação externa nem o fluxo completo de publicação.** OAuth App, secrets, hostname e teste Sanity → webhook → GitHub Actions → site ainda precisam de configuração e validação autorizadas. Despublicação/exclusão permanecem na etapa posterior.

Restrição aprovada em 14/09/2026: manter custo zero de serviços, sem contratação ou autorização de cobrança por excedentes. Não ativar o Zero Trust Free, cujo checkout exigiu cartão. Usar Workers Free e hostname gratuito `workers.dev`; [ADR 0007](docs/adr/0007-login-github-sem-custo.md) substitui o Access por login GitHub. Não trocar automaticamente para planos pagos quando cotas forem atingidas.

Procedimento, evidências e pendências: [`docs/ADMIN-DEPLOYMENT.md`](docs/ADMIN-DEPLOYMENT.md). Decisão e limitações de concorrência: [`ADR 0006`](docs/adr/0006-admin-autenticado-e-transacoes.md).

Status: **vivo / em construção**.

Este Blueprint deve acompanhar o projeto. Mudanças arquiteturais relevantes exigem atualização do Blueprint e, quando apropriado, um ADR. A versão final só será marcada após o Admin, segurança, publicação e teste de reconstrução estarem validados.
