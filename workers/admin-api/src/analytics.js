const GRAPHQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
const DEFAULT_START_DATE = '2026-09-21';
const DEFAULT_HOST = 'vitacerta.com.br';
const DAY_MS = 24 * 60 * 60 * 1000;
let cached;

export function normalizeArticlePath(value) {
  if (!value) return '/';
  let pathname;
  try {
    pathname = new URL(String(value), `https://${DEFAULT_HOST}`).pathname;
  } catch {
    pathname = String(value).split(/[?#]/,1)[0];
  }
  try { pathname = decodeURIComponent(pathname); } catch {}
  pathname = `/${pathname}`.replace(/\/{2,}/g,'/');
  return pathname.length > 1 ? pathname.replace(/\/+$/,'') : '/';
}

function dateAtBrazilMidnight(value) {
  const date = new Date(`${value}T00:00:00-03:00`);
  if (Number.isNaN(date.getTime())) throw new Error('Data inicial de analytics inválida.');
  return date;
}

function rangesBetween(start, end) {
  const ranges = [];
  let cursor = start;
  while (cursor < end) {
    const next = new Date(Math.min(end.getTime(), cursor.getTime() + 30 * DAY_MS));
    ranges.push([cursor.toISOString(),next.toISOString()]);
    cursor = next;
  }
  return ranges;
}

async function queryRange(env, start, end, fetchImpl) {
  const query = `query ArticlePageviews($accountTag: string, $start: Time, $end: Time, $siteTag: string, $requestHost: string) {
    viewer {
      accounts(filter: {accountTag: $accountTag}) {
        rows: rumPageloadEventsAdaptiveGroups(
          limit: 5000
          orderBy: [count_DESC]
          filter: {
            datetime_geq: $start
            datetime_lt: $end
            siteTag: $siteTag
            requestHost: $requestHost
            bot: 0
          }
        ) {
          count
          dimensions { requestPath }
        }
      }
    }
  }`;
  const response = await fetchImpl(GRAPHQL_ENDPOINT,{
    method:'POST',
    headers:{Authorization:`Bearer ${env.CF_ANALYTICS_API_TOKEN}`,'Content-Type':'application/json'},
    body:JSON.stringify({query,variables:{
      accountTag:env.CF_ACCOUNT_ID,
      start,
      end,
      siteTag:env.CF_WEB_ANALYTICS_SITE_TAG,
      requestHost:env.CF_ANALYTICS_HOST || DEFAULT_HOST
    }})
  });
  if (!response.ok) throw new Error('Cloudflare Analytics indisponível.');
  const payload = await response.json();
  if (payload.errors?.length) throw new Error('Cloudflare Analytics recusou a consulta.');
  return payload.data?.viewer?.accounts?.flatMap(account => account.rows || []) || [];
}

export async function fetchArticlePageviews(env,{fetchImpl=fetch,now=()=>new Date()}={}) {
  const from = env.ANALYTICS_START_DATE || DEFAULT_START_DATE;
  const required = [env.CF_ANALYTICS_API_TOKEN,env.CF_ACCOUNT_ID,env.CF_WEB_ANALYTICS_SITE_TAG];
  if (required.some(value => !value)) return {configured:false,from,pageviews:{},updatedAt:null};

  const current = now();
  const canUseProcessCache = fetchImpl === fetch;
  if (canUseProcessCache && cached?.expiresAt > current.getTime()) return cached.data;

  const start = dateAtBrazilMidnight(from);
  const pageviews = {};
  for (const [rangeStart,rangeEnd] of rangesBetween(start,current)) {
    for (const row of await queryRange(env,rangeStart,rangeEnd,fetchImpl)) {
      const path = normalizeArticlePath(row.dimensions?.requestPath);
      if (!path.startsWith('/conteudos/')) continue;
      pageviews[path] = (pageviews[path] || 0) + Number(row.count || 0);
    }
  }

  const data = {configured:true,from,pageviews,updatedAt:current.toISOString()};
  if (canUseProcessCache) cached={expiresAt:current.getTime()+DAY_MS,data};
  return data;
}
