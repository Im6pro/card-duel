// This promise also gates session restore: no game requests before a verified health response.
globalThis.GAME_API_ORIGIN='https://card-duel-iphone.onrender.com';
let finishGameBoot;
globalThis.gameReady=new Promise(resolve=>{finishGameBoot=resolve});
document.addEventListener('DOMContentLoaded',()=>{
  const screen=document.getElementById('boot-screen'),message=document.getElementById('boot-message'),retry=document.getElementById('boot-retry');
  let running=false,ready=false;
  async function wakeGame(){
    if(running||ready)return;
    running=true;retry.hidden=true;screen.setAttribute('aria-busy','true');
    const started=Date.now();
    while(Date.now()-started<120000){
      message.textContent=navigator.onLine===false?'نتأكد من اتصالك بالإنترنت...':Date.now()-started>20000?'الطاولة قاعد تجهز، لحظات ونبدأ...':'نجهّز لك الطاولة...';
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
      try{
        const response=await fetch(globalThis.GAME_API_ORIGIN+'/api/health',{cache:'no-store',signal:controller.signal});
        if(response.ok&&response.headers.get('content-type')?.includes('application/json')){
          const health=await response.json();
          if(health.ready===true&&health.game==='king-slayer'){
            ready=true;running=false;clearTimeout(timeout);
            screen.hidden=true;screen.setAttribute('aria-busy','false');
            document.body.classList.remove('boot-loading');finishGameBoot();return;
          }
        }
      }catch(error){/* Waking services can return HTML, network errors, or a timed-out response. */}
      finally{clearTimeout(timeout)}
      await new Promise(resolve=>setTimeout(resolve,2500));
    }
    running=false;screen.setAttribute('aria-busy','false');
    message.textContent=navigator.onLine===false?'ماكو اتصال بالإنترنت، تأكد من الشبكة':'تأخر الاتصال، جرّب مرة ثانية';
    retry.hidden=false;
  }
  retry.addEventListener('click',wakeGame);
  window.addEventListener('online',wakeGame);
  wakeGame();
});
