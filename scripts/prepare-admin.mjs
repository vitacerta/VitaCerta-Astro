import {cp,mkdir} from 'node:fs/promises';
// Copy only the Admin shell and its compiled assets; no editorial data is embedded.
await mkdir('workers/admin-api/public/admin',{recursive:true});
await cp('dist/admin','workers/admin-api/public/admin',{recursive:true});
await cp('dist/_astro','workers/admin-api/public/_astro',{recursive:true});
console.log('Arquivos do Admin preparados para o novo Worker.');
