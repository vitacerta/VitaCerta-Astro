# VitaCerta — Checklist de Reconstrução

Este checklist comprova se o Blueprint é suficiente para reconstruir o projeto sem depender de conversas anteriores.

## A. Código e dependências

- [ ] Clonar o repositório em ambiente limpo.
- [ ] Instalar dependências com sucesso.
- [ ] Executar o build sem usar arquivos locais não versionados.
- [ ] Confirmar que os caminhos críticos descritos no Blueprint existem.

## B. Sanity

- [ ] Criar novo projeto Sanity.
- [ ] Criar dataset.
- [ ] Aplicar schemas do diretório `cms/`.
- [ ] Configurar as variáveis de ambiente não secretas.
- [ ] Criar token de escrita novo e armazená-lo somente como secret.
- [ ] Criar pelo menos uma categoria.

## C. Site público

- [ ] Gerar uma página de artigo.
- [ ] Confirmar título, descrição, categoria, imagem e corpo.
- [ ] Confirmar canonical e metadados essenciais.
- [ ] Confirmar sitemap/RSS quando aplicável.
- [ ] Confirmar que o build não depende de quantidade fixa de artigos.

## D. Admin

- [ ] Abrir a listagem de artigos.
- [ ] Usar busca/filtros.
- [ ] Abrir Novo artigo.
- [ ] Gerar slug a partir do título.
- [ ] Colar HTML.
- [ ] Visualizar o artigo sem salvar/publicar.
- [ ] Voltar ao editor e corrigir.
- [ ] Salvar rascunho por endpoint autenticado.
- [ ] Publicar por endpoint autenticado.

## E. Segurança

- [ ] Confirmar que nenhum token está no bundle/browser.
- [ ] Confirmar que nenhum secret está no Git.
- [ ] Confirmar autenticação antes das rotas de escrita.
- [ ] Confirmar CORS restrito.
- [ ] Confirmar sanitização/validação do HTML e payload.
- [ ] Confirmar que logs não revelam secrets.

## F. Automação

- [ ] Publicar um artigo no Sanity/Admin.
- [ ] Confirmar disparo do webhook.
- [ ] Confirmar `repository_dispatch`/workflow correspondente.
- [ ] Confirmar build concluído.
- [ ] Confirmar página publicada no site.
- [ ] Editar o artigo e confirmar novo ciclo.

## G. Infraestrutura

- [ ] Configurar hospedagem pública.
- [ ] Configurar domínio/DNS.
- [ ] Criar Worker de Admin separado de outros Workers.
- [ ] Configurar secrets do Worker.
- [ ] Configurar origem/domínio do Admin.
- [ ] Proteger o Admin com autenticação.

## H. Teste final

- [ ] Uma pessoa/IA sem acesso ao histórico das conversas consegue reproduzir o sistema usando apenas repositório + `BLUEPRINT.md` + `docs/` + novas credenciais.
- [ ] Qualquer lacuna encontrada no teste foi incorporada à documentação.

Somente após todos os itens aplicáveis serem validados o kit pode ser marcado como reconstruível.