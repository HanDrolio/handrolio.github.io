// GitHub CI browser smoke: real WebAudio decode, canvas, inputs, dialogs and iPhone landscape layout.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const errors=[];
async function verify(page,label){
  page.on('pageerror',error=>errors.push(label+': '+error.message));
  await page.goto('http://127.0.0.1:8777/rhythm-fighter/',{waitUntil:'domcontentloaded'});
  await page.locator('#launch:not([disabled])').waitFor({timeout:90000});
  assert.ok(await page.locator('[data-persona]').count()===8);
  assert.ok(await page.locator('[data-stage]').count()===7);
  await page.locator('[data-persona="orion"]').click();
  await page.locator('#launch').click();
  await page.locator('#gamebar:visible').waitFor({timeout:15000});
  assert.ok(await page.evaluate(()=>document.body.classList.contains('active')));
  const script=await page.evaluate(()=>({
    chart:window.__rhythmDebug?.chartCount||null,
    ready:document.getElementById('now-playing').textContent
  }));
  assert.ok(script.ready.includes('NEON STATIC'));
  await page.keyboard.press('Escape');
  await page.locator('#pause-screen:visible').waitFor({timeout:10000});
  await page.locator('#pause-help').click();
  await page.locator('#help:visible').waitFor();
  await page.locator('#close-help').click();
  await page.locator('#resume').click();
  await page.locator('#pause-screen').waitFor({state:'hidden',timeout:8000});
  await page.keyboard.down('KeyD');await page.keyboard.up('KeyD');
  await page.locator('#pause-button').click();
  await page.locator('#quit').click();
  await page.locator('#setup:visible').waitFor();
}
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await verify(page,'desktop');
  await page.close();
  const mobile=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2});
  await verify(mobile,'iPhone landscape');
  const fit=await mobile.locator('#touch-pad').evaluate(el=>{
    const buttons=[...el.querySelectorAll('button')];
    return {height:window.innerHeight,rects:buttons.map(b=>({top:b.getBoundingClientRect().top,bottom:b.getBoundingClientRect().bottom}))};
  }).catch(()=>null);
  if(fit)assert.ok(fit.rects.every(b=>b.top>=0&&b.bottom<=fit.height+1),'Landscape buttons must fit viewport');
  await mobile.close();
  assert.deepEqual(errors,[]);
  process.stdout.write('Desktop + iPhone landscape smoke checks passed.\n');
}catch(error){
  process.stderr.write('Browser smoke failed: '+error.stack+'\n'+errors.join('\n'));
  process.exitCode=1;
}finally{await browser.close();}
