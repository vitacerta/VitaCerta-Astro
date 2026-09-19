import {assert} from './errors.js';

const endpoint='https://api.cloudflare.com/client/v4/graphql';

export function periodDates(days,now=new Date()){
  const end=new Date(now);end.setUTCHours(0,0,0,0);end.setUTCDate(end.getUTCDate()+1);
  const start=new Date(end);start.setUTCDate(start.getUTCDate()-days);
  const previousStart=new Date(start);previousStart.setUTCDate(previousStart.getUTCDate()-days);
  return {start:start.toISOString(),end:end.toISOString(),previousStart:previousStart.toISOString()};
}
const value=(item,key)=>Number(item?.sum?.[key]||0);
export function normalizeCloudflare(data){
  const zone=data?.data?.viewer?.zones?.[0];
  const current=zone?.current?.[0]||{},previous=zone?.previous?.[0]||{};
  return {
    configured:true,
    visits:value(current,'visits'),
    requests:Number(current.count||0),
    previousVisits:value(previous,'visits'),
    previousRequests:Number(previous.count||0),
    topPages:(zone?.topPages||[]).map(row=>({path:row.dimensions?.clientRequestPath||'/',visits:value(row,'visits'),requests:Number(row.count||0)}))
  };
}
export async function getCloudflareMetrics(env,fetcher=fetch,days=28){
  if(!env.CLOUDFLARE_ZONE_ID||!env.CLOUDFLARE_ANALYTICS_TOKEN)return {configured:false,reason:'A leitura da Cloudflare ainda precisa ser conectada.'};
  const dates=periodDates(days);
  const query=`query VitaCertaInsights($zoneTag:String!,$host:String!,$start:Time!,$end:Time!,$previousStart:Time!){
    viewer{zones(filter:{zoneTag:$zoneTag}){
      current:httpRequestsAdaptiveGroups(limit:1,filter:{datetime_geq:$start,datetime_lt:$end,clientRequestHTTPHost:$host,requestSource:"eyeball"}){count sum{visits}}
      previous:httpRequestsAdaptiveGroups(limit:1,filter:{datetime_geq:$previousStart,datetime_lt:$start,clientRequestHTTPHost:$host,requestSource:"eyeball"}){count sum{visits}}
      topPages:httpRequestsAdaptiveGroups(limit:10,orderBy:[count_DESC],filter:{datetime_geq:$start,datetime_lt:$end,clientRequestHTTPHost:$host,requestSource:"eyeball"}){count sum{visits} dimensions{clientRequestPath}}
    }}`;
  const response=await fetcher(endpoint,{method:'POST',headers:{Authorization:`Bearer ${env.CLOUDFLARE_ANALYTICS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query,variables:{zoneTag:env.CLOUDFLARE_ZONE_ID,host:env.SITE_HOSTNAME||'vitacerta.com.br',...dates}}),signal:AbortSignal.timeout(15000),redirect:'manual'});
  assert(response.ok,'A Cloudflare não respondeu às métricas.',502);
  const body=await response.json();
  assert(!body.errors?.length,'A Cloudflare recusou a consulta de métricas.',502);
  return normalizeCloudflare(body);
}
