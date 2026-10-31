export function sceneViewerIntent(modelURL, pageURL) {
  const file=new URL(modelURL,pageURL);
  if(file.protocol!=='https:')throw new Error('Для Android AR нужна модель по HTTPS.');
  const fallback=new URL(pageURL);fallback.searchParams.set('ar-fallback','1');
  const params=new URLSearchParams({file:file.href,mode:'ar_preferred',title:'Pine Station',resizable:'true',disable_occlusion:'true'});
  return `intent://arvr.google.com/scene-viewer/1.2?${params}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallback.href)};end;`;
}
export function arStatus(event){return event.detail?.status;}
