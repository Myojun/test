export {$, node, status, todayKey, validDate, displayDate, TIMES, COURSES, capacity, deadline, explain, userError, normalizePhone, phoneHash, seedState, release, slotKey, dateOfTimestamp} from './core.js?v=admin1';
import {$,node,userError,validDate} from './core.js?v=admin1';
export const cancelled=r=>r.status==='취소됨'||r.status==='cancelled';
export function sorted(records){const times=['08','10','13','15'],courses=['기능','도로기초','도봉'];const idx=(a,v)=>a.includes(v)?a.indexOf(v):a.length;return [...records].sort((a,b)=>idx(times,String(a.time||'').replace(/\D/g,'').slice(0,2))-idx(times,String(b.time||'').replace(/\D/g,'').slice(0,2))||idx(courses,a.courseType)-idx(courses,b.courseType)||String(a.name||'').localeCompare(String(b.name||''),'ko'));}
// Preserve the supplied SMS template exactly, including the newline and punctuation.
export function messageTemplate(name,date,time,courseType){if(!validDate(date))throw userError('교육 날짜가 올바르지 않습니다.');const [year,month,day]=date.split('-');const formattedDate=`${parseInt(month)}월 ${parseInt(day)}일`;return `${name} / ${formattedDate} / ${time} / ${courseType}\n예약 반영 완료.`;}
export function smsURI(item){const cleanPhone=String(item.phone||'').replace(/[^0-9]/g,'');if(!/^01[016789]\d{7,8}$/.test(cleanPhone))throw userError('휴대전화 번호를 확인해 주세요.');return `sms:${cleanPhone}?body=${encodeURIComponent(messageTemplate(item.name,item.date,item.time,item.courseType))}`;}
export function showNote(text){$('noteText').textContent=String(text??'');$('noteDialog').showModal();}
let confirming=false;
export function confirmAction({title,text,token='',label='확인'}){
 if(confirming)return Promise.resolve(false);confirming=true;const dialog=$('confirmDialog'),previous=document.activeElement;
 $('confirmTitle').textContent=title;$('confirmText').textContent=text;$('confirmationField').hidden=!token;$('confirmationInput').value='';$('confirmationHint').textContent=token?`계속하려면 “${token}”를 입력하세요.`:'';$('confirmYes').textContent=label;$('confirmYes').disabled=!!token;
 return new Promise(resolve=>{let answer=false;const input=()=>{$('confirmYes').disabled=!!token&&$('confirmationInput').value!==token;};const yes=()=>{if(!$('confirmYes').disabled){answer=true;dialog.close();}};const no=()=>dialog.close();const close=()=>{confirming=false;$('confirmationInput').removeEventListener('input',input);$('confirmYes').removeEventListener('click',yes);$('confirmNo').removeEventListener('click',no);previous?.focus();resolve(answer);};$('confirmationInput').addEventListener('input',input);$('confirmYes').addEventListener('click',yes);$('confirmNo').addEventListener('click',no);dialog.addEventListener('close',close,{once:true});dialog.showModal();});
}
export function range(start,end){if(!validDate(start)||!validDate(end)||start>end)throw userError('시작 날짜와 종료 날짜를 확인해 주세요.');return {start,end};}
export function bytes(n){if(!Number.isFinite(n))return '—';if(n<1024)return `${n.toLocaleString('ko-KR')} B`;if(n<1024**2)return `${(n/1024).toFixed(1)} KiB`;return `${(n/1024**2).toFixed(2)} MiB`;}
const utf8=s=>new TextEncoder().encode(String(s)).length+1;
// Firestore standard-edition document data estimate. Indexes, backups, PITR and
// subcollections are excluded. Unknown SDK types fail rather than claiming a total.
export function valueSize(value){
 if(value===null||typeof value==='boolean')return 1;
 if(typeof value==='number'||typeof value==='bigint')return 8;
 if(typeof value==='string')return utf8(value);
 if(value instanceof Date||typeof value?.toDate==='function')return 8;
 if(value instanceof Uint8Array)return value.byteLength;
 if(value&&typeof value.toUint8Array==='function')return value.toUint8Array().byteLength;
 if(value&&typeof value.latitude==='number'&&typeof value.longitude==='number')return 16;
 if(value&&typeof value.path==='string'&&value.firestore)return documentNameSize(value.path);
 if(Array.isArray(value))return value.reduce((n,v)=>n+valueSize(v),0);
 if(value&&Object.getPrototypeOf(value)===Object.prototype)return Object.entries(value).reduce((n,[k,v])=>n+utf8(k)+valueSize(v),32);
 throw userError('용량을 계산할 수 없는 데이터 형식이 있습니다. Firebase 콘솔에서 확인해 주세요.');
}
export function documentNameSize(path){return path.split('/').reduce((n,s)=>n+utf8(s),16);}
export function documentSize(path,data){return documentNameSize(path)+valueSize(data);}
export function canonical(value){
 if(value===undefined)return ['undefined'];if(value===null)return null;
 if(typeof value==='number')return ['number',String(value)];if(typeof value==='bigint')return ['bigint',String(value)];
 if(value instanceof Date)return ['date',value.toISOString()];
 if(typeof value?.toDate==='function')return ['timestamp',value.seconds,value.nanoseconds];
 if(value instanceof Uint8Array)return ['bytes',...value];
 if(value&&typeof value.toUint8Array==='function')return ['bytes',...value.toUint8Array()];
 if(value&&typeof value.path==='string'&&value.firestore)return ['reference',value.path];
 if(value&&typeof value.latitude==='number'&&typeof value.longitude==='number')return ['point',value.latitude,value.longitude];
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.keys(value).sort().map(k=>[k,canonical(value[k])]);
 return value;
}
export async function fingerprint(data){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(data))));return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function tableCell(row,value){const cell=node('td',value??'—');row.append(cell);return cell;}
