import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const B=process.env.BASE ?? 'http://localhost:3000', S=process.env.OUT ?? '.';
const truth=JSON.parse(readFileSync(new URL('./truth.json', import.meta.url),'utf8'));
const loc=process.argv[2]||'en', w=+(process.argv[3]||1440), mode=process.argv[4]||'sample';
const browser=await chromium.launch();
const c=await browser.newContext({viewport:{width:w,height:900},acceptDownloads:true});
await c.addCookies([{name:'syn-demo-viewer',value:'stf-001',url:B}]);
const p=await c.newPage();
const external=[]; p.on('request',r=>{const u=new URL(r.url()); if(u.protocol!=='blob:' && u.host!=='localhost:3100') external.push(r.url())});
p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,300))});
await p.goto(`${B}/${loc}/staff/ai/canvas`,{waitUntil:'networkidle',timeout:240000});
await p.getByRole('button',{name:loc==='ar'?'رفع مستند ممسوح':'Upload a scan'}).first().click();
if (mode==='sample') await p.getByRole('button',{name:loc==='ar'?/جرّبه/:/sample scan/}).click();
else await p.locator('input[type=file]').setInputFiles(new URL('../../public/samples/ocr-sample-scan-en.jpg', import.meta.url).pathname);
await p.waitForTimeout(800);
const t0=Date.now();
await p.getByRole('button',{name:loc==='ar'?/تحويل إلى نص/:/Convert to editable/}).click();
let last='';
for(let i=0;i<600;i++){ if(p.url().includes('source=ocr')) break; const l=await p.locator('[role=dialog] [aria-live]').first().innerText().catch(()=>''); if(l&&l!==last){last=l; console.log(' stage:',l);} await p.waitForTimeout(500); }
await p.waitForSelector('[role=textbox]',{timeout:60000});
console.log('converted in', ((Date.now()-t0)/1000).toFixed(1),'s; url', p.url().replace(B,''));
const pages=await p.locator('[role=textbox]').evaluateAll(els=>els.map(e=>[...e.querySelectorAll(':scope > p')].map(x=>({t:x.innerText,dir:x.dir}))));
const lev=(a,b)=>{const m=a.length,n=b.length;let prev=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const cur=[i];for(let j=1;j<=n;j++)cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}return prev[n];};
const norm=s=>s.replace(/\s+/g,' ').trim();
const stripAr=s=>s.replace(/[ً-ٰٟـ]/g,'');
const report={};
const order=mode==='sample'?['ar','en']:['en'];
order.forEach((lang,i)=>{
  const got=norm(pages[i].map(x=>x.t).join(' ')), want=norm(truth[lang].join(' '));
  const cer=lev([...got],[...want])/[...want].length;
  const gw=got.split(' '), ww=want.split(' ');
  const wer=lev(gw,ww)/ww.length;
  const cerN=lang==='ar'? lev([...stripAr(got)],[...stripAr(want)])/[...stripAr(want)].length : cer;
  const dirs=pages[i].map(x=>x.dir); 
  report[lang]={lines:pages[i].length, truthLines:truth[lang].length, CER:+(cer*100).toFixed(2), WER:+(wer*100).toFixed(2), CER_noDiacritics:+(cerN*100).toFixed(2), rtlLines:dirs.filter(d=>d==='rtl').length};
  writeFileSync(`${S}/ocr-out-${mode}-${lang}.txt`, pages[i].map(x=>x.t).join('\n'));
});
const lowCount=await p.locator('mark[data-low]').count();
console.log(JSON.stringify(report), 'lowWords', lowCount);
console.log('external requests:', external.length? external : 'none');
// export docx
const [dl]=await Promise.all([p.waitForEvent('download'), p.getByRole('button',{name:loc==='ar'?/تصدير إلى Word/:/Export to Word/}).click()]);
await dl.saveAs(`${S}/ocr-export-${mode}.docx`); console.log('docx', dl.suggestedFilename());
console.log('overflow', await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth));

await browser.close();
