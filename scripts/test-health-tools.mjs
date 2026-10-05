import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculate,classification,decimal,factors,scaleNutrient} from '../src/lib/health-tools.mjs';
let checks=0;
const eq=(a,b)=>{assert.equal(a,b);checks++;};
const near=(a,b)=>{assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);checks++;};
const sample={sex:'male',age:30,weight:70,height:175,activity:1.2};
let r=calculate(sample);near(r.bmi,22.857142857142858);eq(r.resting,1648.75);eq(r.energy,1978.5);near(r.protein[0],49.4625);near(r.carbs[1],321.50625);near(r.fat[0],43.96666666666667);
r=calculate({...sample,sex:'female'});eq(r.resting,1482.75);eq(r.energy,1779.3);
for(const factor of factors) near(calculate({...sample,activity:factor}).energy,1648.75*factor);
for(const [bmi,label] of [[18.49,'Baixo peso'],[18.5,'Faixa de peso adequado'],[24.999,'Faixa de peso adequado'],[25,'Sobrepeso'],[30,'Obesidade — classe I'],[35,'Obesidade — classe II'],[40,'Obesidade — classe III']])eq(classification(bmi),label);
eq(decimal('70,5'),70.5);eq(decimal('70.5'),70.5);
for(const input of ['', '-2','1.000,5','1,000.5','1e2','Infinity','abc']){assert.ok(Number.isNaN(decimal(input)));checks++;}
for(const bad of [{age:19},{age:79},{age:30.5},{weight:0},{weight:-1},{weight:NaN},{weight:301},{height:0},{height:1.75},{height:231},{sex:''},{activity:9}]){assert.throws(()=>calculate({...sample,...bad}));checks++;}
eq(scaleNutrient(null,100),null);eq(scaleNutrient(0,100),0);eq(scaleNutrient(89,50),44.5);eq(scaleNutrient(89,200),178);eq(scaleNutrient(89,150.5),133.945);
for(const grams of [0,-1,NaN,5001]){assert.throws(()=>scaleNutrient(89,grams));checks++;}
const data=JSON.parse(fs.readFileSync(new URL('../public/data/tools-foods.json',import.meta.url)));
eq(data.foods.length,170);const banana=data.foods.find(f=>f.id===173944);eq(banana.values[1008],89);eq(banana.values[1003],1.09);eq(banana.values[1005],22.8);eq(banana.values[1092],358);
console.log(`${checks} mathematical, input and nutrient checks passed.`);


