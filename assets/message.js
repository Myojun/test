import {$,node,status,todayKey,validDate,sorted,cancelled,smsURI,deadline,explain,tableCell} from './admin-core.js?v=admin2';
import {firebase} from './firebase.js?v=admin2';
let records=[],version=0,busy=false;
$('dateInput').value=todayKey();
function render(){
 const data=sorted(records.filter(r=>cancelled(r)?$('filterCancelled').checked:$('filterBooked').checked));const body=$('messageRows');body.replaceChildren();$('messageCount').textContent=`${data.length}명`;
 for(const item of data){const row=node('tr');if(cancelled(item))row.className='cancelled';for(const v of [item.name,item.phone,item.courseType,item.time,item.status])tableCell(row,v);const cell=tableCell(row,'');try{const a=node('a','문자 발송','button');a.href=smsURI(item);a.setAttribute('aria-label',`${item.name||'예약자'} 문자 발송`);cell.append(a);}catch{cell.append(node('span','번호·날짜 확인 필요','small'));}body.append(row);}
 if(!data.length){const row=node('tr'),td=tableCell(row,records.length?'선택한 상태의 예약이 없습니다.':'조회된 예약이 없습니다.');td.colSpan=6;body.append(row);}
}
$('filterAll').addEventListener('change',()=>{$('filterBooked').checked=$('filterCancelled').checked=$('filterAll').checked;render();});
for(const id of ['filterBooked','filterCancelled'])$(id).addEventListener('change',()=>{$('filterAll').checked=$('filterBooked').checked&&$('filterCancelled').checked;render();});
$('dateInput').addEventListener('change',()=>{version++;records=[];$('messageRows').replaceChildren();$('messageCount').textContent='';status('messageStatus','새 날짜를 조회해 주세요.');});
$('messageSearch').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!$('messageSearch').reportValidity())return;const date=$('dateInput').value;if(!validDate(date))return;const token=++version;busy=true;$('loadMessages').disabled=true;records=[];render();status('messageStatus','예약자를 조회하고 있습니다.');
 try{const snapshot=await deadline((async()=>{const {f,db}=await firebase();return f.getDocsFromServer(f.query(f.collection(db,'reservations'),f.where('date','==',date)));})());if(token!==version)return;records=snapshot.docs.map(d=>({...d.data(),id:d.id}));render();status('messageStatus',`${date} 예약 ${records.length}건을 조회했습니다.`);}catch(error){if(token===version)status('messageStatus',explain(error),'error');}finally{busy=false;$('loadMessages').disabled=false;}
});
window.addEventListener('pagehide',()=>{version++;records=[];$('messageRows').replaceChildren();$('messageCount').textContent='';status('messageStatus','날짜를 선택하고 조회해 주세요.');});

window.addEventListener('pageshow',event=>{if(event.persisted){busy=false;$('loadMessages').disabled=false;}});
