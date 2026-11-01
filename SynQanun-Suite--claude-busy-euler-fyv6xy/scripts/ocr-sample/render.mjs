import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const D=process.argv[2] ?? '.';
const truth=JSON.parse(readFileSync(new URL('./truth.json', import.meta.url),'utf8'));
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1240,height:1754},deviceScaleFactor:1});
for (const lang of ['ar','en']) {
  const L=truth[lang]; const dir=lang==='ar'?'rtl':'ltr';
  const font=lang==='ar'?"'Noto Naskh Arabic', serif":"'Noto Serif', serif";
  const body=L.slice(6,12).map(x=>`<p>${x}</p>`).join('');
  const html=`<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&family=Noto+Serif:wght@400;700&display=block" rel="stylesheet">
<style>body{margin:0;background:#fff;color:#111;font-family:${font};}
.p{padding:140px 150px;font-size:30px;line-height:1.75}
h1{font-size:44px;margin:0 0 6px;font-weight:700} .sub{font-size:24px;margin:0;color:#333}
.meta{margin-top:70px} .meta p,.p p{margin:0 0 8px}
.body{margin-top:60px} .sign{margin-top:80px}
hr{border:0;border-top:2px solid #222;margin:24px 0 0}</style></head><body><div class="p">
<h1>${L[0]}</h1><p class="sub">${L[1]}</p><p class="sub">${L[2]}</p><hr>
<div class="meta"><p>${L[3]}</p><p>${L[4]}</p><p><b>${L[5]}</b></p></div>
<div class="body">${body}</div>
<div class="sign"><p>${L[12]}</p><p>${L[13]}</p></div></div></body></html>`;
  await page.setContent(html,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`${D}/clean-${lang}.png`});
}
await browser.close();
