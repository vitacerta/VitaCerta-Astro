import {defineField, defineType} from 'sanity'
import { isUniqueOtherThanLanguage } from '../lib/isUniqueOtherThanLanguage'

export default defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'language',
      title: 'Idioma',
      type: 'string',
      options: {
        list: [
          {title: 'Português (Brasil)', value: 'pt-BR'},
        ],
      },
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
      options: {
        source: 'title',
        maxLength: 96,
        isUnique: isUniqueOtherThanLanguage,
      },
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
      validation: (Rule) => Rule.required(),
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
      fields: [
        {
          name: 'alt',
          title: 'Texto alternativo',
          type: 'string',
        },
      ],
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'thumbnail',
      title: 'Imagem de capa',
      type: 'image',
      fields: [
        {
          name: 'alt',
          title: 'Texto alternativo',
          type: 'string',
        },
      ],
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'categories',
      title: 'Categorias',
      type: 'array',
      of: [{type: 'reference', to: {type: 'category'}}],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Publicado em',
      type: 'datetime',
    }),
    defineField({
      name: 'body',
      title: 'Conteúdo',
      type: 'blockContent',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'thumbnail',
    },
    prepare(selection) {
      const {author} = selection
      return {...selection, subtitle: author && `por ${author}`}
    },
  },
})
