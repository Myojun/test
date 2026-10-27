import {deadline,range,documentSize,fingerprint,userError} from './admin-core.js?v=admin2';
export const COLLECTIONS=['availableDates','reservations','announcements'];
const PAGE=250;
export async function walk(f,db,name,filters=[],orderFields=[],visit=()=>{},progress=()=>{}){
 let cursor=null,total=0;
 while(true){const constraints=[...filters,...orderFields.map(field=>f.orderBy(field)),f.orderBy(f.documentId()),f.limit(PAGE)];if(cursor)constraints.push(f.startAfter(cursor));const snapshot=await deadline(f.getDocsFromServer(f.query(f.collection(db,name),...constraints)),30000);
  for(const doc of snapshot.docs){await visit(doc);total++;}progress(total);if(snapshot.size<PAGE)break;cursor=snapshot.docs.at(-1);
 }
 return total;
}
export async function usage(f,db,progress=()=>{}){
 const summaries=[];
 for(const name of COLLECTIONS){let size=0;const count=await walk(f,db,name,[],[],doc=>{size+=documentSize(doc.ref.path,doc.data());},count=>progress(name,count));summaries.push({name,count,bytes:size});}
 return {summaries,count:summaries.reduce((n,x)=>n+x.count,0),bytes:summaries.reduce((n,x)=>n+x.bytes,0),at:Date.now()};
}
export async function deletionPreview(f,db,start,end,progress=()=>{}){
 range(start,end);const entries=new Map();
 const add=async doc=>{if(entries.has(doc.ref.path))return;const data=doc.data();entries.set(doc.ref.path,{path:doc.ref.path,ref:doc.ref,hash:await fingerprint(data),bytes:documentSize(doc.ref.path,data),collection:doc.ref.path.split('/')[0],date:doc.ref.path.startsWith('availableDates/')&&/^\d{4}-\d{2}-\d{2}$/.test(doc.id)?doc.id:data.date});progress(entries.size);};
 // ID range includes old schedule documents that lack the date field.
 await walk(f,db,'availableDates',[f.where(f.documentId(),'>=',start),f.where(f.documentId(),'<=',end)],[],add);
 await walk(f,db,'availableDates',[f.where('date','>=',start),f.where('date','<=',end)],['date'],add);
 await walk(f,db,'reservations',[f.where('date','>=',start),f.where('date','<=',end)],['date'],add);
 return {start,end,at:Date.now(),entries:[...entries.values()].sort((a,b)=>a.collection.localeCompare(b.collection)||a.path.localeCompare(b.path))};
}
export function sameManifest(a,b){if(a.start!==b.start||a.end!==b.end||a.entries.length!==b.entries.length)return false;const expected=new Map(a.entries.map(x=>[x.path,x.hash]));return b.entries.every(x=>expected.get(x.path)===x.hash);}
export function previewTotals(preview){const result={dates:0,reservations:0,bytes:0,byDate:new Map()};for(const e of preview.entries){const key=e.date||'날짜 확인 필요';const day=result.byDate.get(key)||{dates:0,reservations:0,bytes:0};const field=e.collection==='availableDates'?'dates':'reservations';result[field]++;day[field]++;result.bytes+=e.bytes;day.bytes+=e.bytes;result.byDate.set(key,day);}return result;}
export function assertFresh(preview,start,end,now=Date.now()){if(!preview||preview.start!==start||preview.end!==end||now-preview.at>300000)throw userError('미리보기가 만료되었거나 날짜가 변경되었습니다. 다시 조회해 주세요.');}
// Each transaction commits once; retries have no UI counter side effects.
// A later chunk failure leaves earlier chunks committed and is reported as partial.
export async function deleteManifest(f,db,preview,onProgress=()=>{}){
 let done=0;const entries=preview.entries;
 try{for(const chunk of deletionChunks(entries)){
   await f.runTransaction(db,async tx=>{const reads=[];for(const entry of chunk){const snapshot=await tx.get(entry.ref);if(!snapshot.exists()||await fingerprint(snapshot.data())!==entry.hash)throw userError('미리보기 이후 삭제 대상이 변경되었습니다. 남은 데이터를 다시 조회해 주세요.');reads.push(entry.ref);}for(const ref of reads)tx.delete(ref);});
   done+=chunk.length;onProgress(done,entries.length);
  }return done;
 }catch(error){error.confirmedDeleted=done;error.totalTargets=entries.length;throw error;}
}

export function deletionChunks(entries){const chunks=[];let chunk=[],size=0;for(const entry of entries){if(chunk.length&&(chunk.length>=150||size+entry.bytes>5*1024*1024)){chunks.push(chunk);chunk=[];size=0;}chunk.push(entry);size+=entry.bytes;}if(chunk.length)chunks.push(chunk);return chunks;}
