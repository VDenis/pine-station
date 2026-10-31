import { arStatus } from './ar-utils.js?v=6';
const $=id=>document.getElementById(id);
const mv=$('mv'),status=$('status'),warn=$('warn');
const android=/android/i.test(navigator.userAgent);
const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const launch=$('start-ar');
let lastLaunch='ещё не запускали';
let xrVerdict='проверка…',lastError='нет';
function message(text){warn.textContent=text;warn.style.display='block';}
if(!isSecureContext)message('Откройте эту страницу по HTTPS: без безопасного подключения браузер не запустит AR.');
else if(window.self!==window.top)message('Для AR откройте страницу отдельной вкладкой Chrome, вне встроенного окна другого приложения.');

mv.addEventListener('progress',e=>{const p=e.detail.totalProgress;if(p<1)status.textContent=`Загрузка AR-макета… ${Math.round(p*100)}%`;});
mv.addEventListener('load',()=>{status.textContent='Макет готов · около 90 см в ширину · размер можно менять двумя пальцами';fillDiag();});
mv.addEventListener('error',e=>{lastError=e.detail?.type||'Ошибка загрузки модели';status.textContent='Не удалось загрузить макет. Обновите страницу и проверьте интернет.';fillDiag();});
mv.addEventListener('ar-status',e=>{
  const state=arStatus(e);
  if(state==='session-started')status.textContent='AR запущен · медленно наведите камеру на пол или стол';
  if(state==='object-placed')status.textContent='Макет установлен · двигайте и масштабируйте его двумя пальцами';
  if(state==='failed'){lastError='AR-сессия не запустилась';message('Не удалось запустить AR. На Android проверьте разрешения камеры и AR в Chrome и обновите Google Play Services for AR. На iPhone откройте страницу в Safari.');}
  fillDiag();
});
// Do not request camera permission or await capability checks inside the AR click:
// model-viewer must receive the original user activation to request its XR session.
async function probeXR(){
  try{xrVerdict=navigator.xr?(await navigator.xr.isSessionSupported('immersive-ar')?'поддерживается':'недоступен'):'нет WebXR';}
  catch(e){xrVerdict='проверка отклонена';lastError=e.name+': '+e.message;}
  fillDiag();
}
function fillDiag(){
  $('d-ua').textContent=android?'Android · Chrome '+((navigator.userAgent.match(/Chrome\/(\d+)/)||[])[1]||'—'):navigator.userAgent.slice(0,60);
  $('d-sec').textContent=isSecureContext?'да':'нет';$('d-xr').textContent=navigator.xr?'есть':'нет';$('d-ar').textContent=xrVerdict;
  $('d-btn').textContent=mv.canActivateAR?'да':'нет';
  $('d-launch').textContent=lastLaunch;
  $('d-glb').textContent='V6 · 2,4 МБ · '+(mv.loaded?'загружена':'загрузка');
}
$('diag-toggle').onclick=e=>{e.preventDefault();$('diag').style.display=$('diag').style.display==='block'?'none':'block';fillDiag();};
$('copy').onclick=async()=>{
  const report=[...$('diag').querySelectorAll('.row')].map(row=>[...row.children].map(c=>c.textContent).join(': ')).join('\n');
  try{await navigator.clipboard.writeText(`Pine Station AR V6\n${report}\nОшибка: ${lastError}\n${location.href}\n${navigator.userAgent}`);$('copy').textContent='Отчёт скопирован';}
  catch{$('copy').textContent='Не удалось скопировать — сделайте снимок панели';}
};
setTimeout(()=>{if(!customElements.get('model-viewer'))$('fail').style.display='block';},10000);
fillDiag();probeXR();

// The browser launch never hands off to Google Search. The XR request stays
// synchronously inside this click handler to preserve transient user activation.

function refreshLaunch(){
  const ready=(android||ios)&&!!mv.loaded&&!!mv.canActivateAR&&isSecureContext;
  launch.disabled=!ready;
  launch.textContent='Посмотреть в AR';
  launch.title=ready?'Поставить макет на поверхность':!mv.loaded?'Модель загружается':android||ios?'AR недоступен в этом браузере':'Откройте страницу на Android в Chrome или на iPhone в Safari';
  if(mv.loaded&&!ready)status.textContent=android||ios?'AR недоступен. На Android откройте в Chrome, на iPhone — в Safari.':'Для AR откройте эту страницу на Android в Chrome или на iPhone в Safari.';
}
launch.addEventListener('click',()=>{
  if(launch.disabled)return;
  lastLaunch=ios?'Apple Quick Look':'WebXR в Chrome';status.textContent='Запуск AR… Разрешите доступ, если браузер попросит.';fillDiag();
  try{const request=mv.activateAR();request?.catch(e=>{lastError=e.name+': '+e.message;message('Не удалось запустить AR: '+e.message);fillDiag();});}
  catch(e){lastError=e.name+': '+e.message;message('Не удалось запустить AR: '+e.message);fillDiag();}
});
customElements.whenDefined('model-viewer').then(()=>{refreshLaunch();let count=0;const timer=setInterval(()=>{refreshLaunch();if(++count>50||mv.loaded&&mv.canActivateAR)clearInterval(timer);},300);});
mv.addEventListener('load',refreshLaunch);
window.addEventListener('unhandledrejection',e=>{lastError=String(e.reason?.message||e.reason);fillDiag();});
refreshLaunch();
