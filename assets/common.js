'use strict';
const menu=document.getElementById('menuDialog'),button=document.getElementById('menuToggle');
button.addEventListener('click',()=>{menu.showModal();button.setAttribute('aria-expanded','true');document.body.classList.add('dialog-open');});
document.getElementById('menuClose').addEventListener('click',()=>menu.close());
menu.addEventListener('close',()=>{button.setAttribute('aria-expanded','false');document.body.classList.remove('dialog-open');button.focus();});
menu.addEventListener('click',event=>{const r=menu.getBoundingClientRect();if(event.target===menu&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))menu.close();});
menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>menu.close()));
document.getElementById('noteClose').addEventListener('click',()=>document.getElementById('noteDialog').close());
if(location.protocol==='file:'){const p=document.createElement('p');p.className='callout';p.textContent='관리 기능은 HTTP(S) 서버에서 실행해 주세요. 압축파일의 실행 안내를 확인해 주세요.';document.getElementById('main').prepend(p);}
