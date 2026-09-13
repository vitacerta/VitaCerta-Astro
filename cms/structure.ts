import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('VitaCerta')
    .items([
      S.listItem()
        .title('Artigos')
        .child(
          S.documentTypeList('post')
            .title('Artigos')
            .filter('_type == "post" && language == "pt-BR"')
        ),

      S.listItem()
        .title('Categorias')
        .child(S.documentTypeList('category').title('Categorias')),

      S.divider(),

      S.listItem()
        .title('Autores (interno)')
        .child(S.documentTypeList('author').title('Autores (interno)')),
    ])
