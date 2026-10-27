import {$,status,TIMES,COURSES,userError} from './admin-core.js?v=admin1';
export const DEFAULTS_KEY='kma-driving-admin.capacity-defaults.v1';
export const ORIGINAL_DEFAULTS=[[4,3,2],[3,2,2],[4,3,2],[3,2,2]];
export function validateDefaults(value){if(!Array.isArray(value)||value.length!==4||value.some(row=>!Array.isArray(row)||row.length!==3||row.some(n=>!Number.isInteger(n)||n<0||n>99)))throw userError('저장된 기본값 형식이 올바르지 않습니다.');return value.map(row=>[...row]);}
export function readDefaults(storage){const raw=storage.getItem(DEFAULTS_KEY);if(raw===null)return null;const saved=JSON.parse(raw);if(saved.version!==1)throw userError('저장된 기본값 버전을 확인해 주세요.');return validateDefaults(saved.capacities);}
export function writeDefaults(storage,capacities){const valid=validateDefaults(capacities);storage.setItem(DEFAULTS_KEY,JSON.stringify({version:1,capacities:valid}));return valid;}
export function initDefaults(){
 const inputs=[...document.querySelectorAll('.capacity-input')];
 const apply=matrix=>{for(let t=0;t<4;t++)for(let c=0;c<3;c++)inputs[t*3+c].value=matrix[t][c];};
 const read=()=>validateDefaults(TIMES.map(time=>COURSES.map(course=>{const el=inputs.find(x=>x.dataset.time===time&&x.dataset.course===course);if(el.value.trim()==='')throw userError('모든 정원을 입력해 주세요.');return Number(el.value);}))); 
 const load=()=>{try{const saved=readDefaults(localStorage);apply(saved||ORIGINAL_DEFAULTS);status('defaultsStatus',saved?'이 브라우저에 저장된 기본값을 불러왔습니다.':'아직 저장한 기본값이 없습니다. 처음 제공된 정원을 표시합니다.');}catch{apply(ORIGINAL_DEFAULTS);status('defaultsStatus','기본값을 읽지 못했습니다. 브라우저 저장소 설정을 확인하거나 새 기본값을 저장해 주세요.','error');}};
 $('saveDefaults').addEventListener('click',()=>{try{writeDefaults(localStorage,read());status('defaultsStatus','기본값을 이 브라우저에 저장했습니다. 교육 개설은 별도로 눌러 주세요.','success');}catch(error){status('defaultsStatus',error.message.startsWith('USER:')?error.message.slice(5):'기본값을 저장하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.','error');}});
 $('loadDefaults').addEventListener('click',load);
 $('resetDefaults').addEventListener('click',()=>{apply(ORIGINAL_DEFAULTS);status('defaultsStatus','처음 제공된 정원을 표에 표시합니다. 기본값을 바꾸려면 저장 버튼을 눌러 주세요.');});
 window.addEventListener('storage',event=>{if(event.key===DEFAULTS_KEY)status('defaultsStatus','다른 탭에서 기본값이 변경되었습니다. 저장값 불러오기를 눌러 확인하세요.');});
 load();
}
