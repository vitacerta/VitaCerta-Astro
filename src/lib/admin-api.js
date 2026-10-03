export const categoryLabel = value => ({saude:'Saúde',nutricao:'Nutrição',movimento:'Movimento',mente:'Mente',longevidade:'Longevidade'}[value] || String(value || 'Sem categoria').replaceAll('-',' '));
export async function api(path, data, type) {
  const response = await fetch(`/api/${path}`, {credentials:'same-origin',cache:'no-store',
    ...(data !== undefined ? {method:'POST',headers:{'Content-Type':type || 'application/json','X-VitaCerta-Admin':'1'},body:type ? data : JSON.stringify(data)} : {})});
  if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error('Sessão expirada. Entre novamente pelo endereço do Admin.');
  const result=await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação.');
  return result;
}
