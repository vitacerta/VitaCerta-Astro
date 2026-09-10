import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://vitacerta.com.br/",
    title: "VitaCerta",
    description:
      "Conteúdo confiável e acessível sobre saúde, nutrição, movimento, mente e longevidade.",
    author: "VitaCerta",
    profile: "https://vitacerta.com.br/sobre/",
    ogImage: "default-og.jpg",
    lang: "pt-BR",
    timezone: "America/Sao_Paulo",
    dir: "ltr",
  },
  posts: {
    perPage: 10,
    perIndex: 6,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "pinterest", url: "https://pinterest.com/pin/create/button/?url=" },
    { name: "mail", url: "mailto:?subject=Veja%20este%20artigo&body=" },
  ],
});
