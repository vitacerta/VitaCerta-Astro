import {defineField, defineType} from 'sanity'
import {isUniqueOtherThanLanguage} from '../lib/isUniqueOtherThanLanguage'

export default defineType({
  name: 'post',
  title: 'Artigo',
  type: 'document',
  groups: [
    {name: 'editorial', title: 'Publicação', default: true},
    {name: 'featured', title: 'Destaques'},
    {name: 'technical', title: 'Dados técnicos'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      group: 'editorial',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Resumo / Descrição',
      type: 'text',
      group: 'editorial',
      description: 'Resumo usado nos cards, busca e descrição da página. Máximo de 300 caracteres.',
      validation: (Rule) => Rule.required().min(1).max(300),
    }),
    defineField({
      name: 'categories',
      title: 'Categoria',
      type: 'array',
      group: 'editorial',
      of: [{type: 'reference', to: [{type: 'category'}]}],
      validation: (Rule) => Rule.required().min(1).max(1),
    }),
    defineField({
      name: 'thumbnail',
      title: 'Imagem de capa 16:9',
      type: 'image',
      group: 'editorial',
      description: 'Obrigatória para novos artigos. Use formato horizontal 16:9 e sem texto sobre a imagem. Artigos migrados podem manter a capa legada.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Texto alternativo',
          type: 'string',
          description: 'Descreva brevemente a imagem para acessibilidade.',
        }),
      ],
      options: {hotspot: true},
      validation: (Rule) => Rule.custom((value, context) => {
        const document = context.document
        if (value?.asset) return true
        if (document?.mainImage?.asset || document?.coverUrl) return true
        return 'Adicione uma imagem de capa 16:9 antes de publicar.'
      }),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Data de publicação',
      type: 'datetime',
      group: 'editorial',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'editoriallyUpdatedAt',
      title: 'Atualizado em',
      type: 'datetime',
      group: 'editorial',
      description: 'Preencha somente quando houver uma atualização editorial relevante no conteúdo. Correções de digitação ou ajustes visuais não devem alterar esta data.',
      validation: (Rule) => Rule.custom((value, context) => {
        if (!value) return true
        const publishedAt = context.document?.publishedAt
        if (!publishedAt) return true
        return new Date(value) >= new Date(publishedAt) || 'A data de atualização não pode ser anterior à publicação.'
      }),
    }),
    defineField({
      name: 'body',
      title: 'Conteúdo',
      type: 'blockContent',
      group: 'editorial',
      description: 'Obrigatório para novos artigos. As referências e fontes permanecem dentro do próprio texto. Artigos migrados podem manter o conteúdo legado.',
      validation: (Rule) => Rule.custom((value, context) => {
        if (Array.isArray(value) && value.length > 0) return true
        if (context.document?.legacyBodyHtml) return true
        return 'Adicione o conteúdo do artigo antes de publicar.'
      }),
    }),

    defineField({
      name: 'isHomeFeatured',
      title: 'Destaque principal da Home',
      type: 'boolean',
      group: 'featured',
      description: 'Marque quando esta matéria deve ocupar o destaque principal da página inicial.',
      initialValue: false,
    }),
    defineField({
      name: 'showInHighlights',
      title: 'Exibir em “Em Destaque”',
      type: 'boolean',
      group: 'featured',
      description: 'Inclui a matéria na faixa “Em Destaque +++”. O site exibirá no máximo 5 matérias selecionadas.',
      initialValue: false,
    }),
    defineField({
      name: 'isCienciaVital',
      title: 'Ciência Vital',
      type: 'boolean',
      group: 'featured',
      description: 'Marca a matéria como parte da série editorial Ciência Vital, sem alterar sua categoria principal.',
      initialValue: false,
    }),

    defineField({
      name: 'language',
      title: 'Idioma',
      type: 'string',
      group: 'technical',
      options: {list: [{title: 'Português (Brasil)', value: 'pt-BR'}]},
      initialValue: 'pt-BR',
      validation: (Rule) => Rule.required(),
      readOnly: true,
    }),
    defineField({
      name: 'slug',
      title: 'Endereço do artigo (slug)',
      type: 'slug',
      group: 'technical',
      description: 'Gerado a partir do título. Depois de publicado, deve permanecer estável.',
      options: {source: 'title', maxLength: 96, isUnique: isUniqueOtherThanLanguage},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coverUrl',
      title: 'URL da capa migrada',
      type: 'url',
      group: 'technical',
      description: 'Preserva a capa dos artigos migrados do Blogger.',
      readOnly: true,
    }),
    defineField({
      name: 'canonicalURL',
      title: 'URL canônica migrada',
      type: 'url',
      group: 'technical',
      readOnly: true,
    }),
    defineField({
      name: 'legacyBodyHtml',
      title: 'Conteúdo legado (HTML)',
      type: 'text',
      group: 'technical',
      description: 'Cópia preservada dos artigos migrados do Blogger. Novos artigos usam o campo Conteúdo.',
      readOnly: true,
    }),
    defineField({
      name: 'author',
      title: 'Autor interno (legado)',
      type: 'reference',
      group: 'technical',
      to: [{type: 'author'}],
      weak: true,
      readOnly: true,
      hidden: ({document}) => !document?.author,
    }),
    defineField({
      name: 'duration',
      title: 'Tempo de leitura legado',
      type: 'number',
      group: 'technical',
      readOnly: true,
      hidden: ({document}) => document?.duration == null,
    }),
    defineField({
      name: 'mainImage',
      title: 'Imagem principal legada',
      type: 'image',
      group: 'technical',
      readOnly: true,
      hidden: ({document}) => !document?.mainImage,
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
      options: {hotspot: true},
    }),
  ],
  preview: {
    select: {title: 'title', media: 'thumbnail', isHomeFeatured: 'isHomeFeatured', showInHighlights: 'showInHighlights', isCienciaVital: 'isCienciaVital'},
    prepare(selection) {
      const flags = [
        selection.isHomeFeatured ? 'Home' : null,
        selection.showInHighlights ? 'Em Destaque' : null,
        selection.isCienciaVital ? 'Ciência Vital' : null,
      ].filter(Boolean)
      return {...selection, subtitle: flags.length ? flags.join(' · ') : 'VitaCerta'}
    },
  },
})
