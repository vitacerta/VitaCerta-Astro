# ADR 0006 — Admin autenticado e transações editoriais

Status: implementado em branch de desenvolvimento; implantação e teste externo pendentes.

## Decisão

O novo Worker `vitacerta-admin-api` serve os arquivos compilados do Admin e a API no mesmo endereço. Cloudflare Access protege todo o hostname. `run_worker_first: true` garante que o código do Worker valide a sessão antes de servir inclusive os arquivos estáticos. Não há CORS aberto: a interface usa `/api/` na mesma origem.

O Worker valida a assinatura RS256, emissor, público (`aud`), expiração e identidade do JWT do Access usando `jose`. A identidade deve pertencer à lista explícita `ADMIN_EMAILS`. A proteção externa do Access deve existir antes de atribuir um endereço acessível ao Worker. A configuração versionada vem com `workers_dev: false`, `preview_urls: false` e `WRITES_ENABLED: false`.

HTML passa por `sanitize-html` no servidor, com lista restrita de tags/atributos e protocolos. Scripts, handlers, CSS arbitrário, SVG e iframes são removidos. A prévia chama apenas esse sanitizador; não instancia o cliente Sanity. Publicação e gravação repetem a validação independentemente da prévia.

## Concorrência e compatibilidade

Rascunhos usam `drafts.<id>`. Publicação e remoção do rascunho são uma transação. A revisão publicada e a revisão do rascunho acompanham o formulário; alterações externas causam conflito em vez de sobrescrita silenciosa. `publishedAt` existente é preservado; novos artigos recebem a hora do servidor somente ao publicar. Não há agendamento.

Documentos técnicos `adminArticle.<id>`, `adminSlug.<slug>` e `adminState.home` serializam transações concorrentes do Admin por meio de criação exclusiva ou patch com `ifRevisionID`. A consulta de unicidade também verifica posts preexistentes. As reservas de slug permanecem conservadoramente após mudança de slug de rascunho. Alterações diretas pelo Studio/API que não usam esse protocolo não compartilham os bloqueios: unicidade global com editores externos concorrentes ainda exige disciplina operacional e conferência.

Publicar um destaque Home desmarca os outros publicados na mesma transação. Campos legados e datas editoriais já existentes são preservados. Artigos antigos com slug terminado em hífen podem manter seu endereço; novos slugs seguem formato normalizado. A categoria é sempre uma referência para documento real do tipo `category`.

## Limites atuais

O teste de navegador usa armazenamento fictício, isolado em loopback. Não comprova login real, permissões Sanity, webhooks ou deploy público. Despublicação e exclusão ainda não possuem endpoints neste MVP; continuam pelo Studio até a próxima etapa validada. O Worker de imagens existente não participa destas mudanças.
