# ADR 0007 — Login GitHub no Workers Free

Status: aprovado pelo usuário; implementado em desenvolvimento; ativação externa pendente.

## Contexto e decisão

O projeto não pode contratar serviços pagos ou autorizar cobrança por excedentes. O checkout do Zero Trust Free exigiu cartão e autorização de cobrança; sua ativação foi abandonada. Substituir a parte de autenticação do ADR 0006 por OAuth GitHub no próprio Worker, sem Cloudflare Access.

Usar uma OAuth App dedicada, com escopo vazio: somente identidade pública, sem acesso a repositórios, e-mail privado ou escrita no GitHub. O Worker troca o código no servidor, consulta `/user` e compara o ID numérico com `ALLOWED_GITHUB_IDS`. A conta `vitacerta`, ID público `325269385`, é a identidade inicialmente prevista. Login ou e-mail não são usados como identidade imutável.

O fluxo aplica state aleatório, PKCE S256, callback fixo e cookie temporário criptografado com expiração de 10 minutos. A sessão do Admin contém apenas o ID, expira em uma hora e fica em cookie `__Host-`, Secure, HttpOnly e SameSite=Lax. O token OAuth e o token Sanity nunca são devolvidos ao navegador. Remover um ID da lista bloqueia suas sessões em todas as requisições seguintes.

O logout é POST com origem exata e apaga o cookie local. Sessões são stateless: uma cópia roubada permanece válida até a expiração, salvo remoção da identidade ou rotação de `SESSION_SECRET`. Revogar a autorização no GitHub não encerra imediatamente uma sessão já emitida. O token OAuth é usado apenas para consultar a identidade e não é persistido; uma nova sessão repete o fluxo de login. Não há banco adicional, serviço de e-mail ou assinatura paga para autenticação.

## Custos e implantação

Usar Workers Free e endereço `workers.dev`; não ativar Workers Paid, Zero Trust, serviços medidos pagos ou upgrades automáticos. Manter os demais serviços dentro das cotas gratuitas. Limite atingido pode interromper o serviço; não migrar automaticamente para plano pago. O domínio `vitacerta.com.br` já existente tem renovação própria e não é condição para o Admin em `workers.dev`.

O hostname esperado, inferido do subdomínio mostrado no painel da conta, é `vitacerta-admin-api.blc-comarela.workers.dev`. Confirmar o endereço efetivamente atribuído antes de registrar o callback. O Worker continua sem escrita habilitada enquanto login, segredos e testes externos não forem validados.

Segredos exclusivamente no Cloudflare: `GITHUB_CLIENT_SECRET`, `SESSION_SECRET` (aleatório, pelo menos 32 caracteres) e `SANITY_WRITE_TOKEN`. O usuário os insere na interface segura, sem colar no chat ou GitHub.

## Verificação

17 testes locais passaram, incluindo PKCE/state, conta não autorizada, escopos excessivos, cookies adulterados/expirados, proteção da API/assets, logout e transações editoriais. O teste usa respostas fictícias do GitHub: não comprova autorização real. A compilação local desta revisão foi bloqueada pela política de leitura do ambiente; usar o CI do PR para verificar o bundle e o frontend.

Referências: [OAuth GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), [Workers Free](https://developers.cloudflare.com/workers/platform/pricing/), [limites](https://developers.cloudflare.com/workers/platform/limits/).
