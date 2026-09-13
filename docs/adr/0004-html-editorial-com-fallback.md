# ADR 0004 — HTML editorial novo com fallback de compatibilidade

**Status:** Aceito

## Contexto

Os artigos migrados preservam HTML legado, enquanto o schema também possui conteúdo estruturado em Portable Text. O novo Admin foi aprovado para receber HTML colado e oferecer preview antes da publicação.

## Decisão

Adicionar `bodyHtml` como campo editorial próprio para novos artigos produzidos pelo Admin. O frontend deve respeitar a ordem de renderização:

1. `bodyHtml` — HTML editorial novo;
2. `body` — Portable Text estruturado;
3. `legacyBodyHtml` — HTML migrado.

## Consequências

- Novos artigos em HTML não são marcados como conteúdo legado.
- Os 86 artigos migrados continuam funcionando sem conversão forçada.
- O HTML do Admin precisa ser sanitizado antes de persistência/renderização.
- A presença de múltiplos formatos é intencional durante a transição.

## Em um clone

Se o novo projeto nascer sem legado, `legacyBodyHtml` pode ser omitido. A decisão sobre HTML versus conteúdo estruturado deve ser explícita e documentada.