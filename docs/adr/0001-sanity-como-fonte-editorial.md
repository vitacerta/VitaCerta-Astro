# ADR 0001 — Sanity como fonte editorial oficial

**Status:** Aceito

## Contexto

O VitaCerta possui artigos migrados e novos conteúdos editoriais. GitHub contém o código e snapshots históricos, mas o estado corrente do conteúdo precisa ter uma fonte única e editável.

## Decisão

Sanity é a fonte oficial do conteúdo editorial atual. O Admin VitaCerta é uma camada de operação sobre o Sanity, não uma base paralela. GitHub continua sendo a fonte do código e automações.

## Consequências

- Artigos migrados e novos pertencem ao mesmo histórico editorial.
- Não validar produção contra uma contagem fixa de artigos ou contra snapshots históricos.
- Alterações editoriais devem chegar ao Sanity antes de chegar ao site público.
- O Studio do Sanity permanece como painel técnico/emergencial.

## Em um clone

Criar um novo projeto/dataset Sanity e aplicar os schemas. Nunca reutilizar tokens ou credenciais do VitaCerta.