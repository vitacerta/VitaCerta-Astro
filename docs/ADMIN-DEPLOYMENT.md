# Implantação do Admin VitaCerta

## Verificação atual — 17/09/2026

A revisão com login GitHub `b965cec28e4c4dd1b83cf6b31889ad20cf6a2512` passou no GitHub:
- [Testes e bundle do Worker](https://github.com/vitacerta/VitaCerta-Astro/actions/runs/34826629422).
- [CI do Astro](https://github.com/vitacerta/VitaCerta-Astro/actions/runs/34826653494).
- [Build de preview](https://github.com/vitacerta/VitaCerta-Astro/actions/runs/34826626112).

O painel Cloudflare confirmou o Worker exclusivo `vitacerta-admin-api` e o endereço `https://vitacerta-admin-api.blc-comarela.workers.dev`. A versão inicial `a96d6330` contém somente o exemplo Hello World; o Admin autenticado ainda NÃO está implantado. Não há credenciais ou variáveis configuradas. Preview URLs desativadas; nenhum domínio personalizado ou rota do site foi adicionado.

Pendente: o usuário entrar no GitHub pelo navegador para registrar a OAuth App; inserir secrets diretamente no Cloudflare; implantar a versão validada com escrita desabilitada; validar login real e depois o fluxo editorial autorizado. O site público e o Worker de imagens permanecem fora desta mudança.

## Estado histórico comprovado em 13/09/2026

Base inspecionada: `admin-mvp`, commit `abe5dbf9ad8ab9779a7ba15f0f2c71477e0e0b12`.

- Implementados: autenticação no Worker, leitura de artigos/categorias, rascunho, prévia sem persistência, publicação, edição, upload de capa e validação do HTML/dados no servidor.
- Testes locais de segurança e transações passaram. As mutações usam um substituto em memória do Sanity; não são prova de uma transação real.
- Build Astro concluído: 118 páginas na primeira execução, incluindo 86 artigos existentes. A contagem é uma observação, não uma condição fixa de aprovação.
- `wrangler deploy --dry-run` passou: bundle de aproximadamente 409 KiB, 96 KiB comprimido, sem publicação.
- Teste no navegador local: prévia removeu script/handler, salvou rascunho fictício, listou e reabriu o rascunho, anexou capa de teste e publicou no armazenamento fictício.
- Leitura real no Sanity confirmou cinco categorias e 86 posts publicados naquele momento. Nenhuma mutação foi enviada ao dataset real.
- O usuário entrou no Cloudflare e a conta correta foi confirmada. A ativação do Zero Trust Free apresentou exigência de cartão, aceite de termos e autorização para cobrança por uso excedente; essa alternativa foi abandonada após a exigência de custo zero; ver ADR 0007. Não foram criados Worker, aplicação Access, secret, rota ou DNS. Não houve mudança em `main`, produção ou `vitacerta-image-worker`.

**Não concluído:** autenticação externa, configuração de credencial, implantação protegida, publicação real e cadeia Sanity → webhook → GitHub Actions → site. Despublicação/exclusão ficam para a etapa posterior ao MVP validado.

## Verificações no GitHub — 14/09/2026

Código verificado: commit `0c01e624a90a279b1fa07ed6846f4e345843cfd6`, branch `admin-api-secure-mvp`, [PR #1](https://github.com/vitacerta/VitaCerta-Astro/pull/1) contra `admin-mvp`.

- [Testes e bundle do Worker](https://github.com/vitacerta/VitaCerta-Astro/actions/runs/34824590064): sucesso.
- [Build de preview](https://github.com/vitacerta/VitaCerta-Astro/actions/runs/34824494101): sucesso.
- [CI: build com npm ci e verificação da saída](https://github.com/vitacerta/VitaCerta-Astro/actions/runs/34824590055): sucesso.

Essas execuções não publicam o novo Worker nem validam o webhook após uma mutação real. O PR permanece rascunho. A atualização posterior deste registro é documental; a referência acima identifica o código efetivamente testado.

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

O primeiro build local foi executado com dependências resolvidas pelo pnpm conforme os intervalos do `package.json` (Astro 6.4.8), sem alteração do lockfile da raiz. O CI existente usa `npm ci`; seu build e a verificação da saída também passaram no GitHub (evidências abaixo). O Worker tem seu próprio `pnpm-lock.yaml` e foi testado com `jose 6.2.12`, `sanitize-html 2.17.7` e Wrangler 4.131.1.

## Sequência segura de ativação — GitHub OAuth / Workers Free

Decisão aprovada em 14/09/2026: usar o login GitHub descrito no ADR 0007. Não ativar Cloudflare Access/Zero Trust nem aceitar cartão, cobrança por excedentes ou upgrade pago. As evidências de CI acima correspondem à implementação anterior; não comprovam o novo login. A nova versão passou 17 testes locais com provedores simulados; seu CI passou (ver registro de 17/09 acima); o teste externo continua pendente.

1. Confirmar Workers Free na conta existente. Criar somente `vitacerta-admin-api`, preservando o Worker de imagens. Usar endereço gratuito `workers.dev`, sem alterar DNS público. Confirmar o hostname atribuído antes de registrar OAuth.
2. Preparar uma OAuth App dedicada no GitHub, sem permissões de repositório. Homepage: `https://<hostname>/admin/`; callback: `https://<hostname>/auth/callback`. O usuário conclui o registro e manipula a credencial diretamente na interface segura.
3. Configurar `ADMIN_ORIGIN` com a origem HTTPS exata, `GITHUB_CLIENT_ID` com o identificador público e `ALLOWED_GITHUB_IDS=325269385` para a conta `vitacerta`. IDs adicionais exigem autorização explícita. O cliente solicita escopo vazio e rejeita tokens com escopos adicionais.
4. O usuário insere os secrets `GITHUB_CLIENT_SECRET` e `SESSION_SECRET` (valor aleatório de pelo menos 32 caracteres) exclusivamente em Cloudflare → Settings → Variables and Secrets. Não incluir os valores em chat, GitHub, comandos versionados ou capturas.
5. Após aprovação da implantação no novo endereço, ativar `workers_dev=true`, manter `preview_urls=false` e `WRITES_ENABLED=false`. Publicar código e assets a partir da branch de validação. A configuração incompleta bloqueia o acesso; toda requisição de API e assets passa pelo Worker autenticado.
6. Verificar login real, callback fixo, conta autorizada, rejeição de acesso anônimo à API/assets, expiração e logout. O login mostra apenas uma página de entrada pública; não revela conteúdo editorial.
7. O usuário cria/insere `SANITY_WRITE_TOKEN` diretamente nos secrets do Worker com o menor escopo disponível. Se o plano só oferecer permissão ampla, pedir aprovação para o escopo concreto. Nenhum token Sanity é enviado ao navegador ou ao GitHub.
8. Preferir dataset separado de validação, se disponível na cota gratuita, com categorias reais desse dataset e conteúdo fictício. Sua criação exige aprovação. Validar leitura e prévia antes de habilitar escrita.
9. Após aprovação, habilitar escrita no ambiente de validação e testar rascunho, publicação e edição. Só depois solicitar autorização para o teste específico no dataset `production` e no site público.

A sessão criptografada dura uma hora e contém apenas o ID da conta. Remover o ID autorizado bloqueia suas sessões; rotacionar `SESSION_SECRET` invalida todas. Logout apaga o cookie do navegador, mas não revoga uma cópia roubada; revogar a autorização no GitHub também não encerra imediatamente uma sessão já emitida. Detalhes no ADR 0007.

Não há bypass de autenticação configurável para o Worker real. `test/browser-server.js` é apenas o servidor local de dados fictícios. Cotas gratuitas podem interromper o serviço; não autorizar migração automática para planos pagos.

## Contrato de API

Todas as rotas de API abaixo exigem sessão válida. As rotas `/auth/login` e `/auth/callback` implementam o login público; `/auth/logout` aceita somente POST da mesma origem. POST exige `Origin` exato e `X-VitaCerta-Admin: 1`. Não há CORS entre origens; Admin e API são servidos juntos. Respostas são `no-store`.

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

Falha ou prazo excedido na resposta de escrita pode ocorrer após a transação ter sido aceita. Reabrir o artigo para conferir o estado antes de tentar de novo. Para suspender novas gravações, definir `WRITES_ENABLED=false` no novo Worker; manter o login GitHub ativo. O Studio permanece como operação técnica/emergencial.


## Conexão do Cloudflare — 17/09/2026

Repositório conectado ao Worker exclusivo, branch `admin-api-secure-mvp`, previews de outras branches desativados. Usuário autorizou o token automático de builds após apresentação das permissões amplas da conta. Runtime mantém `WRITES_ENABLED=false`; painel confirmou os três secrets sob seus nomes corretos, sem leitura dos valores. `SANITY_DATASET` corrigido; nomes antigos com erro permanecem sem uso.

Build usa Node 24, npm ci na raiz, leitura pública do Sanity, prepare-admin.mjs, dependências do Worker travadas via pnpm 11.19.0 e testes antes de wrangler deploy. Nenhum secret Sanity é fornecido ao GitHub ou ao build. Este commit inicia a primeira compilação; resultado externo e login ainda pendentes.
