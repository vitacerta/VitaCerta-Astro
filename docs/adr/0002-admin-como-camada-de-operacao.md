# ADR 0002 — Admin VitaCerta como camada de operação

**Status:** Aceito

## Contexto

O Sanity Studio é tecnicamente completo, mas não oferece a experiência editorial simplificada desejada para a operação cotidiana do VitaCerta.

## Decisão

Criar um Admin VitaCerta próprio, simples e focado no fluxo editorial diário. O Admin não substitui o Sanity como banco/fonte de verdade; ele opera sobre o Sanity por meio de uma camada segura server-side.

Fluxo principal:

`Admin → endpoint seguro → Sanity → webhook → GitHub Actions → Astro → site`

## Consequências

- O Admin pode evoluir sem alterar a fonte editorial.
- O Sanity Studio permanece disponível como painel técnico/emergencial.
- Tokens de escrita nunca ficam no navegador.
- Preview não deve salvar nem publicar.
- Autenticação é obrigatória antes de liberar escrita pública.

## Em um clone

Reutilizar a separação de responsabilidades, mas criar novas credenciais, novo endpoint e nova proteção de acesso.