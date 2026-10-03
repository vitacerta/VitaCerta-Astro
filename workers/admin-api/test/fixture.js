import assert from 'node:assert/strict';
export function fakeApi(initial={}){
  let docs=structuredClone(initial),rev=0;const transactions=[];
  return {transactions,get docs(){return docs;},
    async query(q,p={}){
      if(q==='*[_id in $ids]')return p.ids.map(id=>docs[id]).filter(Boolean);
      if(q.includes('_type == "category"'))return p.id==='category-1'?1:0;
      if(q.includes('sanity.imageAsset'))return {metadata:{dimensions:{aspectRatio:16/9}}};
      if(q.startsWith('count('))return Object.values(docs).filter(d=>d._type==='post' && d.slug?.current===p.slug && !p.ids.includes(d._id)).length;
      if(q==='*[_id == $id][0]')return docs[p.id] || null;
      if(q.includes('adminState.home'))return docs['adminState.home'] || null;
      if(q.includes('isHomeFeatured'))return Object.values(docs).filter(d=>d._type==='post' && !d._id.includes('.') && d.isHomeFeatured && d._id!==p.id);
      throw new Error(q);
    },
    async mutate(ms){const next=structuredClone(docs);for(const m of ms){
      if(m.create){assert.ok(!next[m.create._id],'create deve detectar colisão');next[m.create._id]={...m.create,_rev:`rev-${++rev}`};}
      if(m.patch){assert.equal(next[m.patch.id]._rev,m.patch.ifRevisionID);Object.assign(next[m.patch.id],m.patch.set);}
      if(m.createOrReplace)next[m.createOrReplace._id]={...m.createOrReplace,_rev:`rev-${++rev}`};
      if(m.delete)delete next[m.delete.id];
    }docs=next;transactions.push(ms);},
  };
}
