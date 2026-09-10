export const EDITORIAL_CATEGORIES = [
  {
    name: "Saúde",
    slug: "saude",
    description: "Prevenção, sinais do corpo, cuidados e informação para decisões mais conscientes.",
  },
  {
    name: "Nutrição",
    slug: "nutricao",
    description: "Alimentação, nutrientes, dietas e escolhas práticas baseadas em evidências.",
  },
  {
    name: "Movimento",
    slug: "movimento",
    description: "Atividade física, força, mobilidade e formas realistas de manter o corpo ativo.",
  },
  {
    name: "Mente",
    slug: "mente",
    description: "Sono, atenção, equilíbrio emocional e hábitos que apoiam a saúde mental.",
  },
  {
    name: "Longevidade",
    slug: "longevidade",
    description: "Hábitos, prevenção e ciência para viver mais e melhor ao longo dos anos.",
  },
] as const;

export type EditorialCategoryName = (typeof EDITORIAL_CATEGORIES)[number]["name"];
