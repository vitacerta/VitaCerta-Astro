import {defineField, defineType} from 'sanity'
import {isUniqueOtherThanLanguage} from '../lib/isUniqueOtherThanLanguage'

export default defineType({
  name: 'post',
  title: 'Artigo',
  type: 'document',
  fields: [
    defineField({
      name: 'language',
      title: 'Idioma',
      type: 'string',
      options: {list: [{title: 'Português (Brasil)', value: 'pt-BR'}]},
      initialValue: 'pt-BR',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Título',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96, isUnique: isUniqueOtherThanLanguage},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Descrição',
      type: 'text',
      description: 'Máximo de 300 caracteres',
      validation: (Rule) => Rule.required().min(1).max(300),
    }),
    defineField({
      name: 'author',
      title: 'Autor',
      type: 'reference',
      to: [{type: 'author'}],
      weak: true,
    }),
    defineField({
      name: 'duration',
      title: 'Tempo de leitura',
      type: 'number',
      description: 'Tempo estimado de leitura em minutos',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'mainImage',
      title: 'Imagem principal',
      type: 'image',
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
      options: {hotspot: true},
    }),
    defineField({
      name: 'thumbnail',
      title: 'Imagem de capa',
      type: 'image',
      fields: [defineField({name: 'alt', title: 'Texto alternativo', type: 'string'})],
      options: {hotspot: true},
    }),
    defineField({
      name: 'coverUrl',
      title: 'URL da capa migrada',
      type: 'url',
      description: 'Preserva a imagem de capa existente durante a migração do Blogger.',
    }),
    defineField({
      name: 'categories',
      title: 'Categorias',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'category'}]}],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publicado em',
      type: 'datetime',
    }),
    defineField({
      name: 'canonicalURL',
      title: 'URL canônica',
      type: 'url',
    }),
    defineField({
      name: 'body',
      title: 'Conteúdo',
      type: 'blockContent',
    }),
    defineField({
      name: 'legacyBodyHtml',
      title: 'Conteúdo legado (HTML)',
      type: 'text',
      description: 'Cópia preservada dos artigos migrados do Blogger. Novos artigos usam o campo Conteúdo.',
      readOnly: true,
    }),
  ],
  preview: {
    select: {title: 'title', author: 'author.name', media: 'thumbnail'},
    prepare(selection) {
      const {author} = selection
      return {...selection, subtitle: author ? `por ${author}` : 'VitaCerta'}
    },
  },
})
