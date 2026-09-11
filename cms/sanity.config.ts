import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {documentInternationalization} from '@sanity/document-internationalization'
import {internationalizedArray} from 'sanity-plugin-internationalized-array'
import {structure} from './structure'
import {table} from '@sanity/table'

const languages = [
  {id: 'pt-BR', title: 'Português (Brasil)'},
]

export default defineConfig({
  name: 'default',
  title: 'VitaCerta',

  projectId: '1dh7sg5j',
  dataset: 'production',

  plugins: [
    table(),
    visionTool(),
    structureTool({
      structure,
    }),
    documentInternationalization({
      supportedLanguages: languages,
      schemaTypes: ['post', 'author', 'podcast'],
      languageField: 'language',
      weakReferences: true,
      bulkPublish: true,
      hideLanguageFilter: true,
    }),
    internationalizedArray({
      languages,
      defaultLanguages: ['pt-BR'],
      fieldTypes: ['string'],
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
