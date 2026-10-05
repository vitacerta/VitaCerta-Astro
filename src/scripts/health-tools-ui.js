import {calculate, decimal, scaleNutrient} from '../lib/health-tools.mjs';
const el = id => document.getElementById(id);
const fmt = (v, digits = 0) => v.toLocaleString('pt-BR', {maximumFractionDigits: digits});
const form = el('health-form');
const descriptions = {'1.2':'Pouca ou nenhuma atividade física estruturada.','1.375':'Atividade física leve algumas vezes por semana.','1.55':'Atividade física regular durante a semana.','1.725':'Treinos ou atividade intensa com alta frequência.','1.9':'Rotina excepcionalmente elevada de treinamento ou atividade física.'};
el('activity').addEventListener('change', () => {el('activity-help').textContent = descriptions[el('activity').value] || 'Considere sua rotina inteira, incluindo trabalho e deslocamentos.';});
form.addEventListener('input', () => {if (!el('health-results').hidden) el('stale-result').hidden = false;});
form.addEventListener('submit', event => {
  event.preventDefault();
  el('form-error').textContent = '';
  for (const field of form.querySelectorAll('[aria-invalid]')) field.removeAttribute('aria-invalid');
  const values = {sex:el('sex').value,age:decimal(el('age').value),weight:decimal(el('weight').value),height:decimal(el('height').value),activity:decimal(el('activity').value)};
  const invalid = !values.sex ? 'sex' : !Number.isInteger(values.age) || values.age < 20 || values.age > 78 ? 'age' : !Number.isFinite(values.weight) || values.weight < 30 || values.weight > 300 ? 'weight' : !Number.isFinite(values.height) || values.height < 120 || values.height > 230 ? 'height' : !Number.isFinite(values.activity) ? 'activity' : null;
  try {
    const r = calculate(values);
    const energy = value => fmt(Math.round(value / 10) * 10);
    const range = values => `${fmt(values[0])}–${fmt(values[1])} g/dia`;
    el('results-content').innerHTML = `<div class="result-grid"><div class="result-card"><h4>IMC</h4><strong>${fmt(r.bmi,2)}</strong><p>Classificação: ${r.classification}</p><small>Indicador de triagem, não de composição corporal.</small></div><div class="result-card"><h4>Metabolismo basal estimado</h4><strong>${energy(r.resting)}</strong><p>kcal/dia em repouso</p><small>Energia aproximada para funções básicas. Equação de Mifflin–St Jeor.</small></div><div class="result-card wide"><h4>Gasto energético diário estimado</h4><strong>${energy(r.energy)} <span style="font-size:1rem">kcal/dia</span></strong><small>Repouso × fator de atividade ${fmt(values.activity,3)}. Estimativa populacional, não uma meta alimentar.</small></div></div><h4>Macronutrientes · faixas educativas</h4><div class="macro-list"><div><span>Proteínas<small>10–35% da energia</small></span><strong>${range(r.protein)}</strong></div><div><span>Carboidratos<small>45–65% da energia</small></span><strong>${range(r.carbs)}</strong></div><div><span>Gorduras<small>20–35% da energia</small></span><strong>${range(r.fat)}</strong></div></div><p class="scope">Não some os extremos das faixas. Existem diferentes distribuições possíveis; a combinação escolhida deve totalizar 100% da energia. Proteínas e carboidratos: 4 kcal/g; gorduras: 9 kcal/g.</p>`;
    el('result-placeholder').hidden = true; el('health-results').hidden = false; el('stale-result').hidden = true; el('health-results').focus();
  } catch (error) {el('form-error').textContent = error.message; if(invalid){el(invalid).setAttribute('aria-invalid','true');el(invalid).focus();}}
});
el('edit-data').addEventListener('click', () => el('sex').focus());
let foodData, selected, loading;
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
async function loadFoods() {
  if (foodData) return;
  if (!loading) loading = fetch('/data/tools-foods.json').then(r => {if(!r.ok) throw Error();return r.json();}).then(data => {foodData=data;}).catch(() => {el('food-status').textContent='Não foi possível carregar os alimentos. Digite novamente para tentar.';}).finally(()=>{loading=null;});
  await loading;
}
async function searchFoods() {
  el('food-status').textContent='Carregando alimentos…';
  await loadFoods(); if(!foodData) return;
  const query = normalize(el('food-search').value.trim());
  const terms = query.split(/\s+/).filter(Boolean);
  const matches = foodData.foods.filter(f => terms.every(term => normalize(f.name+' '+f.original).includes(term)));
  el('food-status').textContent = `${matches.length} alimento${matches.length===1?'':'s'} encontrado${matches.length===1?'':'s'} na seleção de ${foodData.foods.length}.`;
  el('food-options').replaceChildren();
  for (const food of matches) {
    const button = document.createElement('button'); button.type='button';button.textContent=food.name;button.setAttribute('aria-pressed',String(selected?.id===food.id));
    button.addEventListener('click', () => {selected=food; for(const b of el('food-options').children)b.setAttribute('aria-pressed',String(b===button));el('quantity-choice').value='100';el('grams').value='100';el('custom-quantity').hidden=true;el('food-detail').hidden=false;el('food-placeholder').hidden=true;el('food-title').textContent=food.name;el('food-original').textContent=food.original;el('food-source').href=`https://fdc.nal.usda.gov/food-details/${food.id}/nutrients`;renderFood();el('food-title').focus();});
    el('food-options').append(button);
  }
  if (!matches.length) el('food-status').textContent='Alimento não encontrado nesta seleção. Tente banana, ovo, feijão ou outro termo.';
}
function renderFood() {
  if(!selected) return;
  const grams=decimal(el('quantity-choice').value==='custom'?el('grams').value:el('quantity-choice').value);
  el('nutrients').replaceChildren();el('quantity-error').textContent='';el('grams').removeAttribute('aria-invalid');
  try {scaleNutrient(0,grams);} catch(error){el('quantity-error').textContent=error.message;el('grams').setAttribute('aria-invalid','true');return;}
  const heading=document.createElement('h4');heading.textContent=`Composição em ${fmt(grams,2)} g`;el('nutrients').append(heading);
  for (const group of ['principal','micro']) {
    if(group==='micro'){const h=document.createElement('h4');h.textContent='Vitaminas e minerais';el('nutrients').append(h);}
    const dl=document.createElement('dl');
    for(const nutrient of foodData.nutrients.filter(n=>n.group===group)) {
      const amount=scaleNutrient(selected.values[nutrient.id],grams);
      const row=document.createElement('div');row.className='nutrient-row';const dt=document.createElement('dt');dt.textContent=nutrient.name;const dd=document.createElement('dd');dd.textContent=amount===null?'Não disponível':`${amount>0&&amount<.01?'< 0,01':fmt(amount,2)} ${nutrient.unit}`;row.append(dt,dd);dl.append(row);
    }el('nutrients').append(dl);
  }
}
el('food-search').addEventListener('input',searchFoods);
el('food-search').addEventListener('focus',()=>{if(!foodData)searchFoods();});
el('quantity-choice').addEventListener('change',()=>{el('custom-quantity').hidden=el('quantity-choice').value!=='custom';renderFood();if(!el('custom-quantity').hidden)el('grams').focus();});
el('grams').addEventListener('input',renderFood);
