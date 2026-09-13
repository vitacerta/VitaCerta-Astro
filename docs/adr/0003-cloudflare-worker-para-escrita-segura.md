# ADR 0003 — Cloudflare Worker para escrita segura

**Status:** Aceito

## Contexto

O Admin precisa criar, editar, publicar e futuramente despublicar/excluir documentos no Sanity. O token de escrita não pode ser exposto no JavaScript do navegador.

## Decisão

Usar um Cloudflare Worker como camada server-side entre o Admin e o Sanity. O Worker receberá requisições autenticadas do Admin, validará origem/payload/permissões e fará as mutações no Sanity usando secrets armazenados no ambiente Cloudflare.

## Consequências

- `SANITY_WRITE_TOKEN` nunca é entregue ao navegador.
- O Worker deve aplicar CORS restritivo e validação de entrada.
- Rotas de escrita só podem ser expostas depois da autenticação do Admin estar configurada.
- Logs nunca devem registrar tokens ou conteúdo sensível de secrets.
- O Worker de Admin deve ser separado do Worker de geração de imagens.

## Em um clone

Criar um Worker novo, com secrets novos e origem permitida correspondente ao novo Admin. Nunca reutilizar secrets do VitaCerta.