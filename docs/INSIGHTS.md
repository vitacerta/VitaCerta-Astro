# VitaCerta Insights

Painel separado e somente leitura para acompanhar acessos e SEO, sem alterar o Admin Editorial.

## V1 — Cloudflare

Mostra visitas, requisições, comparação com o período anterior e páginas mais acessadas nos últimos 28 dias.

Variáveis públicas:
- `INSIGHTS_ORIGIN`
- `GITHUB_CLIENT_ID`
- `ALLOWED_GITHUB_IDS`
- `SITE_HOSTNAME`
- `CLOUDFLARE_ZONE_ID`

Segredos:
- `GITHUB_CLIENT_SECRET`
- `SESSION_SECRET`
- `CLOUDFLARE_ANALYTICS_TOKEN`

O token da Cloudflare deve ter somente permissão de leitura de Analytics para a zona VitaCerta.

Callback do OAuth GitHub:
`https://vitacerta-insights.blc-comarela.workers.dev/auth/callback`

## V2 — Google Search Console

Adicionar consultas, páginas, cliques, impressões, CTR e posição média usando credencial somente leitura. Nenhuma credencial deve ser enviada ao navegador ou registrada no repositório.
