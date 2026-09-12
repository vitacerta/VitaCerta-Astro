import rss from '@astrojs/rss';
import { client } from '../lib/sanity';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
  const posts = await client.fetch(`
    *[_type == "post" && language == "pt-BR"]
    | order(publishedAt desc, _createdAt desc){
      title,
      description,
      publishedAt,
      _createdAt,
      "slug": slug.current
    }
  `);

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: new Date(post.publishedAt || post._createdAt),
      link: `/conteudos/${post.slug}/`,
    })),
  });
}
