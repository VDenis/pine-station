import { sceneViewerIntent, arStatus } from './ar-utils.js';
const $=id=>document.getElementById(id);
const mv=$('mv'),status=$('status'),warn=$('warn');
const android=/android/i.test(navigator.userAgent);
const glb=new URL(mv.getAttribute('src'),location.href).href;
let xrVerdict='проверка…',lastError='нет';
function message(text){warn.textContent=text;warn.style.display='block';}
// A real user-tapped link opens the Android app, even without WebXR in Chrome.
if(android&&location.protocol==='https:'){
  $('scene-viewer').href=sceneViewerIntent(glb,location.href);$('scene-viewer').hidden=false;
}
if(!isSecureContext)message('Откройте эту страницу по HTTPS: без безопасного подключения браузер не запустит AR.');
else if(window.self!==window.top)message('Для AR откройте страницу отдельной вкладкой Chrome, вне встроенного окна другого приложения.');
if(new URLSearchParams(location.search).has('ar-fallback'))message('Android не открыл Google Scene Viewer. Обновите приложения Google и Google Play Services for AR в Google Play или попробуйте кнопку «AR в браузере».');

mv.addEventListener('progress',e=>{const p=e.detail.totalProgress;if(p<1)status.textContent=`Загрузка AR-макета… ${Math.round(p*100)}%`;});
mv.addEventListener('load',()=>{status.textContent='Макет готов · около 90 см в ширину · размер можно менять двумя пальцами';fillDiag();});
mv.addEventListener('error',e=>{lastError=e.detail?.type||'Ошибка загрузки модели';status.textContent='Не удалось загрузить макет. Обновите страницу и проверьте интернет.';fillDiag();});
mv.addEventListener('ar-status',e=>{
  const state=arStatus(e);
  if(state==='session-started')status.textContent='AR запущен · медленно наведите камеру на пол или стол';
  if(state==='object-placed')status.textContent='Макет установлен · двигайте и масштабируйте его двумя пальцами';
  if(state==='failed'){lastError='AR-сессия не запустилась';message('AR в браузере не запустился. На Android попробуйте «Поставить в комнате». Для WebXR разрешите доступ к камере и дополненной реальности в настройках сайта Chrome.');}
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
  $('d-glb').textContent='V4 · 2,4 МБ · '+(mv.loaded?'загружена':'загрузка');
}
$('diag-toggle').onclick=e=>{e.preventDefault();$('diag').style.display=$('diag').style.display==='block'?'none':'block';fillDiag();};
$('copy').onclick=async()=>{
  const report=[...$('diag').querySelectorAll('.row')].map(row=>[...row.children].map(c=>c.textContent).join(': ')).join('\n');
  try{await navigator.clipboard.writeText(`Pine Station AR V4\n${report}\nОшибка: ${lastError}\n${location.href}\n${navigator.userAgent}`);$('copy').textContent='Отчёт скопирован';}
  catch{$('copy').textContent='Не удалось скопировать — сделайте снимок панели';}
};
setTimeout(()=>{if(!customElements.get('model-viewer'))$('fail').style.display='block';},10000);
fillDiag();probeXR();
