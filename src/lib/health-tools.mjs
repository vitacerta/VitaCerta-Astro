export const factors = [1.2, 1.375, 1.55, 1.725, 1.9];
export function decimal(value) {
  const s = String(value).trim();
  return /^\d+(?:[.,]\d+)?$/.test(s) ? Number(s.replace(',', '.')) : NaN;
}
export function classification(bmi) {
  if (bmi < 18.5) return 'Baixo peso';
  if (bmi < 25) return 'Faixa de peso adequado';
  if (bmi < 30) return 'Sobrepeso';
  if (bmi < 35) return 'Obesidade — classe I';
  if (bmi < 40) return 'Obesidade — classe II';
  return 'Obesidade — classe III';
}
export function calculate({sex, age, weight, height, activity}) {
  if (!['female', 'male'].includes(sex)) throw Error('Selecione o sexo utilizado pela equação.');
  if (!Number.isInteger(age) || age < 20 || age > 78) throw Error('Informe uma idade inteira entre 20 e 78 anos.');
  if (!Number.isFinite(weight) || weight < 30 || weight > 300) throw Error('Confira o peso: informe entre 30 e 300 kg.');
  if (!Number.isFinite(height) || height < 120 || height > 230) throw Error('Confira a altura: informe entre 120 e 230 cm.');
  if (!factors.includes(activity)) throw Error('Selecione seu nível de atividade.');
  const bmi = weight / (height / 100) ** 2;
  const resting = 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);
  const energy = resting * activity;
  return {bmi, classification: classification(bmi), resting, energy,
    protein: [energy * .10 / 4, energy * .35 / 4],
    carbs: [energy * .45 / 4, energy * .65 / 4],
    fat: [energy * .20 / 9, energy * .35 / 9]};
}
export function scaleNutrient(value, grams) {
  if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) throw Error('Informe uma quantidade maior que 0 e até 5.000 g.');
  return value === null || value === undefined ? null : value * grams / 100;
}
