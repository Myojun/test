'use strict';
document.getElementById('noteClose').addEventListener('click',()=>document.getElementById('noteDialog').close());
if(location.protocol==='file:'){const p=document.createElement('p');p.className='callout';p.textContent='관리 기능은 HTTP(S) 서버에서 실행해 주세요. 압축파일의 실행 안내를 확인해 주세요.';document.getElementById('main').prepend(p);}
