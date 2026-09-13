# ADR 0005 — Validação dinâmica de conteúdo

**Status:** Aceito

## Contexto

A migração inicial trouxe 86 artigos, mas esse número é histórico. O projeto precisa aceitar o 87º, 88º e seguintes sem alterar regras técnicas.

## Decisão

Workflows de CI, preview e produção não devem exigir contagem fixa de artigos nem comparar o estado atual com snapshots históricos da migração. Devem validar o conteúdo corrente e as páginas realmente geradas.

## Consequências

- O número 86 não é contrato de produção.
- Arquivos de migração permanecem como evidência histórica.
- Validações devem verificar integridade: slug, título, categoria, duplicidades, páginas geradas, canonical, sitemap/RSS e demais invariantes técnicas.

## Em um clone

Nunca codificar a quantidade inicial de conteúdo como regra permanente. Validar invariantes, não volume histórico.