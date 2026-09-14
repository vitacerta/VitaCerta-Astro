# Implantação do Admin VitaCerta

## Estado comprovado em 13/09/2026

Base inspecionada: `admin-mvp`, commit `abe5dbf9ad8ab9779a7ba15f0f2c71477e0e0b12`.

- Implementados: autenticação no Worker, leitura de artigos/categorias, rascunho, prévia sem persistência, publicação, edição, upload de capa e validação do HTML/dados no servidor.
- Testes locais de segurança e transações passaram. As mutações usam um substituto em memória do Sanity; não são prova de uma transação real.
- Build Astro concluído: 118 páginas na primeira execução, incluindo 86 artigos existentes. A contagem é uma observação, não uma condição fixa de aprovação.
- `wrangler deploy --dry-run` passou: bundle de aproximadamente 409 KiB, 96 KiB comprimido, sem publicação.
- Teste no navegador local: prévia removeu script/handler, salvou rascunho fictício, listou e reabriu o rascunho, anexou capa de teste e publicou no armazenamento fictício.
- Leitura real no Sanity confirmou cinco categorias e 86 posts publicados naquele momento. Nenhuma mutação foi enviada ao dataset real.
- O usuário entrou no Cloudflare e a conta correta foi confirmada. A ativação do Zero Trust Free apresentou exigência de cartão, aceite de termos e autorização para cobrança por uso excedente; essa etapa foi deixada para o usuário. Não foram criados Worker, aplicação Access, secret, rota ou DNS. Não houve mudança em `main`, produção ou `vitacerta-image-worker`.

**Não concluído:** autenticação externa, configuração de credencial, implantação protegida, publicação real e cadeia Sanity → webhook → GitHub Actions → site. Despublicação/exclusão ficam para a etapa posterior ao MVP validado.

## Arquivos

- `workers/admin-api/src/`: implementação server-side.
- `workers/admin-api/test/`: testes; o servidor de navegador usa apenas dados fictícios e escuta em `127.0.0.1`.
- `workers/admin-api/wrangler.jsonc`: configuração inicial sem endpoints públicos e sem escrita.
- `src/lib/admin-*.js` e `src/pages/admin/`: interface existente conectada à API.
- `scripts/prepare-admin.mjs`: copia o Admin compilado e assets para o Worker.
- `.github/workflows/admin-api-check.yml`: testes e compilação, sem deploy.

## Build reproduzível

Use Node 24. Na raiz, instale com `npm ci` para respeitar o `package-lock.json` existente. Defina apenas `VITE_SANITY_PROJECT_ID=1dh7sg5j`, `VITE_SANITY_DATASET=production` e `SANITY_PREVIEW=false` no ambiente do build; não forneça token de escrita.

```sh
npm run build
node scripts/prepare-admin.mjs
cd workers/admin-api
pnpm install --ignore-workspace --frozen-lockfile --ignore-scripts
node --test test/*.test.js
node node_modules/wrangler/bin/wrangler.js deploy --dry-run --outdir dist
```

O primeiro build local foi executado com dependências resolvidas pelo pnpm conforme os intervalos do `package.json` (Astro 6.4.8), sem alteração do lockfile da raiz. O CI existente usa `npm ci`; seu resultado precisa ser conferido separadamente. O Worker tem seu próprio `pnpm-lock.yaml` e foi testado com `jose 6.2.12`, `sanitize-html 2.17.7` e Wrangler 4.131.1.

## Sequência segura de ativação

1. Entrar diretamente no Cloudflare; não fornecer senhas ou tokens pelo chat.
2. Confirmar conta que contém `vitacerta.com.br`. Não modificar `vitacerta-image-worker`.
3. Definir um hostname exclusivo de validação, por exemplo `admin-preview.vitacerta.com.br`, e a lista exata de editores autorizados. Solicitar aprovação antes de criar permissões ou alterar DNS/rotas.
4. Configurar uma aplicação Cloudflare Access para **todo o hostname**, com política Allow restrita aos e-mails aprovados, sessão curta e demais identidades negadas. Não usar política Bypass/Everyone. Confirmar a proteção antes de expor o Worker.
5. Configurar o novo Worker e preencher `ADMIN_ORIGIN` com a origem HTTPS exata; `ACCESS_TEAM_DOMAIN` com `https://<equipe>.cloudflareaccess.com`; `ACCESS_AUD` com o público da aplicação; `ADMIN_EMAILS` com a lista aprovada separada por vírgula. Esses valores não são o token de escrita.
6. Manter `WRITES_ENABLED=false`, `workers_dev=false` e `preview_urls=false`. Publicar somente a cópia compilada do novo Worker após aprovação para a ativação do endereço protegido.
7. Validar acesso anônimo negado, editor não autorizado negado e editor autorizado aceito. Verificar que assets e API não são acessíveis por um endereço alternativo. Testar também JWT ausente, inválido e expirado.
8. O usuário cria/insere `SANITY_WRITE_TOKEN` diretamente em **Settings → Variables and Secrets** do Worker. O token precisa acessar o projeto/dataset escolhido e as operações editoriais e assets necessárias; usar o menor escopo disponível. Nunca registrar o valor em código, comandos versionados, screenshots, chat ou GitHub. Se o plano não permitir restringir adequadamente o escopo, pedir aprovação para a permissão efetivamente disponível.
9. Preferir um dataset privado de validação, separado de `production`, com categorias e um artigo fictício. A criação do dataset e credencial requer aprovação. Alterar `SANITY_DATASET` apenas no Worker de validação; manter o site público intacto. Validar leitura e prévia antes de habilitar escrita.
10. Após aprovação, habilitar escrita no ambiente de validação e testar rascunho/publicação/edição. Somente depois solicitar autorização para conectar o Worker ao dataset `production` e fazer um artigo de teste público específico.

Não há bypass de autenticação configurável para o Worker real. `test/browser-server.js` é apenas um servidor local de testes, não uma entrada de deploy.

## Contrato de API

Todas as rotas exigem sessão válida. POST exige `Origin` exato e `X-VitaCerta-Admin: 1`. Não há CORS entre origens; Admin e API são servidos juntos. Respostas são `no-store`.

| Rota | Método | Efeito |
| --- | --- | --- |
| `/api/session` | GET | Verifica sessão e disponibilidade de escrita |
| `/api/categories` | GET | Categorias publicadas e IDs reais |
| `/api/articles` | GET | Lista publicada/rascunho, com rascunho prevalecendo por ID |
| `/api/article?id=...` | GET | Documento e revisões usadas para evitar sobrescrita |
| `/api/preview` | POST | Sanitiza HTML; zero chamadas ao Sanity |
| `/api/images` | POST | Asset JPEG/PNG/WebP, assinatura validada, limite de 5 MB |
| `/api/draft` | POST | Valida e salva `drafts.<id>` |
| `/api/publish` | POST | Valida e publica; remove rascunho na mesma transação |

Payload editorial: `id`, `expected: {draftRevision, publishedRevision}`, `title`, `slug`, `description`, `categoryId`, `bodyHtml`, `thumbnailId`, `thumbnailAlt`, `isHomeFeatured`, `showInHighlights`, `isCienciaVital`. Revisões ausentes são `null`. Campos extras, inclusive datas/agendamento, são rejeitados.

## Teste externo obrigatório e evidências

Registrar, sem secrets, a versão do Worker, hostname, configuração de proteção verificada, IDs/revisões do artigo e horários. Nunca marcar esta lista por inferência a partir de testes locais.

- [ ] Acesso anônimo/identidade não permitida negados; editor autorizado consegue entrar.
- [ ] Categorias do ambiente aparecem pelo ID correto.
- [ ] Prévia sanitiza HTML malicioso sem salvar documento, asset ou disparar webhook.
- [ ] Rascunho persiste e pode ser reaberto; site continua sem o novo artigo.
- [ ] Categoria falsa, slug ocupado, revisão antiga e HTML inválido são rejeitados.
- [ ] Publicação cria o documento publicado e remove o rascunho atomicamente.
- [ ] Edição mantém `publishedAt`; publicação posterior não muda a data original.
- [ ] Upload real e proporção da capa são verificados.
- [ ] Para teste autorizado em produção: registrar ID do documento e hora de publicação.
- [ ] Conferir entrega do webhook existente e execução `repository_dispatch` com evento `sanity-publish`.
- [ ] Conferir conclusão do workflow de produção e URL pública, incluindo título, HTML, categoria e capa.
- [ ] Planejar despublicação/remoção do artigo de teste com aprovação explícita; não apagar conteúdo real automaticamente.

Antes do teste em produção, inspecionar o filtro do webhook existente. Ele deve ignorar rascunhos, assets e documentos técnicos `adminArticle`, `adminSlug`, `adminState`; não assumir que a configuração atual já faz isso. Qualquer correção do webhook é mudança de produção e precisa de aprovação.

## Limitações e recuperação

O Admin não é ainda uma prévia visual exata do layout público Fyrre. A prévia mostra o novo `bodyHtml`; para artigos Portable Text/legados sem `bodyHtml`, o editor informa que o conteúdo anterior será preservado até a colagem de HTML novo.

Reservas de slug evitam concorrência entre operações deste Admin. O Studio e integrações externas não adotam automaticamente o protocolo; conferir conflitos antes de permitir editores concorrentes por outros meios. Revisões impedem sobrescrita dos documentos já lidos, mas não constituem uma restrição de unicidade de banco para qualquer escritor externo.

Uma capa enviada antes de um salvamento rejeitado pode ficar como asset sem referência. Sua limpeza é separada e exige revisão; não excluir automaticamente assets do dataset.

Falha ou prazo excedido na resposta de escrita pode ocorrer após a transação ter sido aceita. Reabrir o artigo para conferir o estado antes de tentar de novo. Para suspender novas gravações, definir `WRITES_ENABLED=false` no novo Worker; manter Access ativo. O Studio permanece como operação técnica/emergencial.
