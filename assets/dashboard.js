import {$,node,status,todayKey,validDate,TIMES,COURSES,sorted,cancelled,showNote,confirmAction,deadline,explain,userError,phoneHash,normalizePhone,seedState,release,slotKey,tableCell} from './admin-core.js?v=admin3';
import {firebase,initialState,activeRecords} from './firebase.js?v=admin3';
import {deletionPreview,previewTotals,assertFresh,sameManifest,deleteManifest} from './db-data.js?v=admin3';
import {initDefaults} from './defaults.js?v=admin3';
initDefaults();$('createDate').value=$('searchDate').value=todayKey();let creating=false,searching=false,cancelling=false,deleting=false,version=0;
$('deleteScheduleButton').addEventListener('click',async()=>{
 if(deleting||creating||cancelling)return;const date=$('createDate').value;if(!validDate(date)){status('createStatus','날짜를 선택해 주세요.','error');return;}
 deleting=true;$('deleteScheduleButton').disabled=$('createButton').disabled=true;let started=false;
 try{status('createStatus','삭제할 날짜의 데이터를 확인하고 있습니다.');const {f,db}=await deadline(firebase());const manifest=await deletionPreview(f,db,date,date);if(!manifest.entries.length){status('createStatus','이 날짜에 삭제할 데이터가 없습니다.');return;}const totals=previewTotals(manifest);
 const confirmed=await confirmAction({title:'교육 삭제',text:`${date} 교육 일정 ${totals.dates}건과 예약 ${totals.reservations}건을 영구 삭제합니다. 계속하시겠습니까?`,label:'삭제하기'});
 if(!confirmed){status('createStatus','삭제를 취소했습니다.');return;}assertFresh(manifest,date,date);const current=await deletionPreview(f,db,date,date);if(!sameManifest(manifest,current))throw userError('예약 데이터가 변경되었습니다. 다시 확인해 주세요.');started=true;
 const count=await deleteManifest(f,db,manifest,(done,total)=>status('createStatus',`${done} / ${total}개 삭제 확인 완료`));status('createStatus',`${date} 교육과 예약 ${count}개 문서를 삭제했습니다.`,'success');version++;$('reservationRows').replaceChildren();$('resultCaption').textContent='예약 내역';status('searchStatus','삭제 후 예약 내역을 다시 조회해 주세요.');
 }catch(error){status('createStatus',explain(error)+(started?` 성공 응답으로 확인된 삭제: ${error.confirmedDeleted||0}개. 실제 남은 데이터는 다시 조회해 주세요.`:''),'error');}
 finally{deleting=false;$('deleteScheduleButton').disabled=$('createButton').disabled=false;}
});
$('createForm').addEventListener('submit',async event=>{
 event.preventDefault();if(creating||deleting||!$('createForm').reportValidity())return;const date=$('createDate').value;if(!validDate(date))return;
 const timeSlots={};for(const time of TIMES){timeSlots[time]={};for(const course of COURSES){const input=document.querySelector(`.capacity-input[data-time="${time}"][data-course="${course}"]`);const maxCapacity=Number(input.value);if(!Number.isInteger(maxCapacity)||maxCapacity<0||maxCapacity>99){status('createStatus','정원은 0~99 사이 정수로 입력해 주세요.','error');return;}timeSlots[time][course]={maxCapacity,currentCount:0,isAvailable:maxCapacity>0};}}
 creating=true;$('createButton').disabled=true;status('createStatus','교육을 개설하고 있습니다.');
 try{const {f,db}=await deadline(firebase());const ref=f.doc(db,'availableDates',date);const state=await deadline(seedState(await activeRecords(f,db,date)));for(const time of TIMES)for(const course of COURSES){const count=state.counts[slotKey(time,course)]||0;if(count>timeSlots[time][course].maxCapacity)throw userError('기존 예약 수보다 정원이 작습니다. 예약 내역을 먼저 확인해 주세요.');timeSlots[time][course].currentCount=count;}await f.runTransaction(db,async tx=>{const snapshot=await tx.get(ref);if(snapshot.exists())throw userError('이미 개설된 날짜입니다. 기존 일정과 예약은 덮어쓰지 않습니다.');tx.set(ref,{date,isActive:true,timeSlots,bookingState:state,createdAt:f.serverTimestamp(),createdBy:'admin'});});status('createStatus',`${date} 교육이 개설되었습니다.`,'success');}catch(error){status('createStatus',explain(error),'error');}finally{creating=false;$('createButton').disabled=false;}
});
async function search(){
 if(searching||cancelling)return;const date=$('searchDate').value;if(!validDate(date))return;const token=++version;searching=true;$('searchButton').disabled=true;$('reservationRows').replaceChildren();status('searchStatus','예약을 조회하고 있습니다.');
 try{const snapshot=await deadline((async()=>{const {f,db}=await firebase();return f.getDocsFromServer(f.query(f.collection(db,'reservations'),f.where('date','==',date)));})());if(token!==version)return;const records=sorted(snapshot.docs.map(d=>({...d.data(),id:d.id})));$('resultCaption').textContent=`${date} 예약 ${records.length}건`;
 for(const r of records){const row=node('tr');if(cancelled(r))row.className='cancelled';for(const v of [r.date,r.time,r.courseType,r.name,`${r.grade??'—'}학년`,`${r.unit??'—'}중대`,r.phone,r.status])tableCell(row,v);const note=tableCell(row,'');if(typeof r.note==='string'&&r.note.trim()){const b=node('button','보기');b.type='button';b.addEventListener('click',()=>showNote(r.note));note.append(b);}else note.textContent='-';const action=tableCell(row,'');if(r.status==='예약됨'){const b=node('button','예약 취소');b.type='button';b.addEventListener('click',()=>cancel(r));action.append(b);}else action.textContent=cancelled(r)?'취소됨':'—';$('reservationRows').append(row);}
 status('searchStatus',records.length?`${records.length}건을 확인했습니다.`:'해당 날짜에 예약이 없습니다.');
 }catch(error){if(token===version)status('searchStatus',explain(error),'error');}finally{searching=false;$('searchButton').disabled=false;}
}
$('searchForm').addEventListener('submit',event=>{event.preventDefault();if($('searchForm').reportValidity())search();});
$('searchDate').addEventListener('change',()=>{version++;$('reservationRows').replaceChildren();$('resultCaption').textContent='예약 내역';status('searchStatus','새 날짜를 조회해 주세요.');});
async function cancel(r){
 if(cancelling||searching||deleting)return;cancelling=true;
 const confirmed=await confirmAction({title:'예약 취소',text:`${r.date} ${r.time} ${r.courseType}\n${r.name} 예약을 취소하시겠습니까?`,label:'예약 취소'});if(!confirmed){cancelling=false;return;}
 status('searchStatus','예약을 취소하고 있습니다.');let outcome='';let kind='success';
 try{if(!validDate(r.date)||!TIMES.includes(r.time)||!COURSES.includes(r.courseType))throw userError('예약 정보를 확인해 주세요.');const phone=normalizePhone(r.phone);if(!phone)throw userError('예약 전화번호 형식을 확인해 주세요.');const {f,db}=await deadline(firebase());const ref=f.doc(db,'reservations',r.id),dateRef=f.doc(db,'availableDates',r.date);const [seed,hash]=await deadline(Promise.all([initialState(f,db,r.date),phoneHash(phone)]));
 await f.runTransaction(db,async tx=>{const snapshot=await tx.get(ref);if(!snapshot.exists())throw userError('예약이 존재하지 않습니다.');const current=snapshot.data();if(cancelled(current))return;if(current.status!=='예약됨'||current.date!==r.date||current.time!==r.time||current.courseType!==r.courseType||normalizePhone(current.phone)!==phone)throw userError('예약 정보가 변경되었습니다. 다시 조회해 주세요.');const date=await tx.get(dateRef);if(date.exists()){const data=date.data(),state=release(data,seed,hash,r.id,current.time,current.courseType);const patch={bookingState:state};if(data.timeSlots?.[current.time]?.[current.courseType])patch[`timeSlots.${current.time}.${current.courseType}.currentCount`]=state.counts[slotKey(current.time,current.courseType)];tx.update(dateRef,patch);}tx.update(ref,{status:'취소됨',canceledAt:f.serverTimestamp(),updatedAt:f.serverTimestamp(),canceledBy:'admin'});});outcome='예약을 취소했습니다.';
 }catch(error){outcome=explain(error)+' 현재 예약 상태를 다시 조회해 주세요.';kind='error';}finally{cancelling=false;}
 await search();status('searchStatus',outcome,kind);
}
window.addEventListener('pagehide',()=>{version++;$('reservationRows').replaceChildren();});

window.addEventListener('pageshow',event=>{if(event.persisted){searching=false;$('searchButton').disabled=false;$('resultCaption').textContent='예약 내역';status('searchStatus','조회할 날짜를 선택해 주세요.');}});

window.addEventListener('beforeunload',event=>{if(deleting){event.preventDefault();event.returnValue='';}});
