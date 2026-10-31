import { sceneViewerIntent, arStatus } from './ar-utils.js?v=5';
const $=id=>document.getElementById(id);
const mv=$('mv'),status=$('status'),warn=$('warn');
const android=/android/i.test(navigator.userAgent);
const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const launch=$('start-ar');
let lastLaunch='ещё не запускали';
const glb=new URL(mv.getAttribute('src'),location.href).href;
let xrVerdict='проверка…',lastError='нет';
function message(text){warn.textContent=text;warn.style.display='block';}
// A real user-tapped link opens the Android app, even without WebXR in Chrome.
if(android&&location.protocol==='https:'){
  $('scene-viewer').href=sceneViewerIntent(glb,location.href);$('scene-viewer').hidden=false;
  const sample='https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Avocado/glTF-Binary/Avocado.glb';
  $('ar-test').href=sceneViewerIntent(sample,location.href);$('ar-test').hidden=false;
  for(const id of ['scene-viewer','ar-test'])$(id).addEventListener('click',()=>{
    lastLaunch=id==='ar-test'?'системный AR · тестовая модель':'системный AR · станция';
    sessionStorage.setItem('pine-ar-native',JSON.stringify({at:Date.now(),kind:lastLaunch}));fillDiag();
  });
}
if(!isSecureContext)message('Откройте эту страницу по HTTPS: без безопасного подключения браузер не запустит AR.');
else if(window.self!==window.top)message('Для AR откройте страницу отдельной вкладкой Chrome, вне встроенного окна другого приложения.');
if(new URLSearchParams(location.search).has('ar-fallback'))message('Android не открыл Google Scene Viewer. Обновите приложения Google и Google Play Services for AR в Google Play или попробуйте кнопку «Запустить AR в Chrome».');

mv.addEventListener('progress',e=>{const p=e.detail.totalProgress;if(p<1)status.textContent=`Загрузка AR-макета… ${Math.round(p*100)}%`;});
mv.addEventListener('load',()=>{status.textContent='Макет готов · около 90 см в ширину · размер можно менять двумя пальцами';fillDiag();});
mv.addEventListener('error',e=>{lastError=e.detail?.type||'Ошибка загрузки модели';status.textContent='Не удалось загрузить макет. Обновите страницу и проверьте интернет.';fillDiag();});
mv.addEventListener('ar-status',e=>{
  const state=arStatus(e);
  if(state==='session-started')status.textContent='AR запущен · медленно наведите камеру на пол или стол';
  if(state==='object-placed')status.textContent='Макет установлен · двигайте и масштабируйте его двумя пальцами';
  if(state==='failed'){lastError='AR-сессия не запустилась';message('AR в браузере не запустился. Обновите Chrome и Google Play Services for AR. Для WebXR разрешите доступ к камере и дополненной реальности в настройках сайта Chrome.');}
  fillDiag();
});
// Do not request camera permission or await capability checks inside the AR click:
// model-viewer must receive the original user activation to request its XR session.
$('webxr').addEventListener('click',()=>{status.textContent='Запуск AR… Разрешите доступ, если Chrome попросит.';});
async function probeXR(){
  try{xrVerdict=navigator.xr?(await navigator.xr.isSessionSupported('immersive-ar')?'поддерживается':'недоступен · используйте Android AR'):'нет WebXR · используйте Android AR';}
  catch(e){xrVerdict='проверка отклонена';lastError=e.name+': '+e.message;}
  fillDiag();
}
function fillDiag(){
  $('d-ua').textContent=android?'Android · Chrome '+((navigator.userAgent.match(/Chrome\/(\d+)/)||[])[1]||'—'):navigator.userAgent.slice(0,60);
  $('d-sec').textContent=isSecureContext?'да':'нет';$('d-xr').textContent=navigator.xr?'есть':'нет';$('d-ar').textContent=xrVerdict;
  $('d-btn').textContent=mv.canActivateAR?'да':'нет · нативная кнопка доступна отдельно';
  $('d-launch').textContent=lastLaunch;
  $('d-glb').textContent='V5 · 2,4 МБ · '+(mv.loaded?'загружена':'загрузка');
}
$('diag-toggle').onclick=e=>{e.preventDefault();$('diag').style.display=$('diag').style.display==='block'?'none':'block';fillDiag();};
$('copy').onclick=async()=>{
  const report=[...$('diag').querySelectorAll('.row')].map(row=>[...row.children].map(c=>c.textContent).join(': ')).join('\n');
  try{await navigator.clipboard.writeText(`Pine Station AR V5\n${report}\nОшибка: ${lastError}\n${location.href}\n${navigator.userAgent}`);$('copy').textContent='Отчёт скопирован';}
  catch{$('copy').textContent='Не удалось скопировать — сделайте снимок панели';}
};
setTimeout(()=>{if(!customElements.get('model-viewer'))$('fail').style.display='block';},10000);
fillDiag();probeXR();

// The browser launch never hands off to Google Search. The XR request stays
// synchronously inside this click handler to preserve transient user activation.
launch.hidden=!(android||ios);
function refreshLaunch(){
  if(!(android||ios))return;
  const ready=!!mv.loaded&&!!mv.canActivateAR;
  launch.disabled=!ready;
  launch.textContent=!mv.loaded?'Загрузка AR-макета…':ios?'Открыть AR на iPhone':ready?'Запустить AR в Chrome':'AR в Chrome недоступен';
}
launch.addEventListener('click',()=>{
  if(launch.disabled)return;
  lastLaunch=ios?'Apple Quick Look':'WebXR в Chrome';fillDiag();
  try{const request=mv.activateAR();request?.catch(e=>{lastError=e.name+': '+e.message;message('Не удалось запустить AR: '+e.message);fillDiag();});}
  catch(e){lastError=e.name+': '+e.message;message('Не удалось запустить AR: '+e.message);fillDiag();}
});
customElements.whenDefined('model-viewer').then(()=>{refreshLaunch();let count=0;const timer=setInterval(()=>{refreshLaunch();if(++count>50||mv.loaded&&mv.canActivateAR)clearInterval(timer);},300);});
mv.addEventListener('load',refreshLaunch);
function checkNativeReturn(){
  const raw=sessionStorage.getItem('pine-ar-native');if(!raw)return;
  sessionStorage.removeItem('pine-ar-native');
  try{const previous=JSON.parse(raw);lastLaunch=previous.kind+' · возврат на страницу';
    if(Date.now()-previous.at<15000)message('Системный просмотрщик вернулся на страницу. Если он закрылся сам, используйте «Запустить AR в Chrome». В диагностике есть тестовая модель: если закрывается и она, проблема не связана с моделью станции.');
  }catch{}fillDiag();
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkNativeReturn();});
window.addEventListener('pageshow',checkNativeReturn);
window.addEventListener('unhandledrejection',e=>{lastError=String(e.reason?.message||e.reason);fillDiag();});
refreshLaunch();
