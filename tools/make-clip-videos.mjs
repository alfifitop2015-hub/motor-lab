/* يصنع ملفات فيديو «مقطع التوصيل» لكل تمرين video/clips/<التمرين>.mp4 من المقطع نفسه داخل المحاكي:
   التوصيل سلكًا سلكًا ثم تجربة التشغيل، مع الشرح المكتوب والشرح الصوتي، فيُحمَّل من زر ⬇ في نافذة المقطع.
   يُعاد تشغيله بعد أي تعديل على التوصيلات النموذجية أو نصوص الشرح أو تجربة التشغيل.
   المتطلبات: Node، وحزمة playwright مع Chromium، وffmpeg، واتصال بالإنترنت (الصوت من خدمة النطق نفسها التي يستخدمها المحاكي عبر الإنترنت).
   الاستخدام:  node tools/make-clip-videos.mjs            (كل التمارين)
               node tools/make-clip-videos.mjs p1 p7      (تمارين محددة)
   متغيرات اختيارية: FPS (الافتراضي 10)، TTS_CACHE (مجلد حفظ مقاطع النطق لإعادة الاستخدام) */
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdtemp, rm, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {chromium} = createRequire(import.meta.url)('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUTD = path.join(ROOT, 'video', 'clips');
const FPS = +process.env.FPS || 10, W = 720, GAP = 600, END_HOLD = 2500;
const CACHE = process.env.TTS_CACHE || path.join(tmpdir(), 'motor-lab-tts');
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json'};

/* الصفحة كما هي، مع منفذ صغير للأداة داخل الشيفرة: يلتقط نصوص الشرح الصوتي بدل نطقها، ويعطي الوصول إلى المقطع */
const HOOK = `
window.__wc={get S(){return S;},PNAME,PRESETS,DEMO,exPick,exMotor,wcStart,wcShow,wcEnd,said:[],
  hook(){speak=(t,q)=>{if(t)window.__wc.said.push({t:spkText(t),q:!!q});return true;};spkBusy=()=>false;WCSND=true;}};
})();
`;
const server = createServer(async (req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    let b = await readFile(f);
    if (f === path.join(ROOT, 'index.html')) {
      const s = b.toString(), k = s.indexOf('\n})();\n');
      if (k < 0) throw new Error('لم يُعثر على نهاية شيفرة المحاكي في index.html');
      b = s.slice(0, k) + HOOK + s.slice(k + 7);
    }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'}).end(b);
  } catch { res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}/`;

const dur = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* النطق: نفس تقسيم المحاكي للجمل (حتى 190 حرفًا للمقطع الواحد) ونفس خدمة الصوت عبر الإنترنت */
function chunks(t) {
  const parts = [];
  t.replace(/([.،:!؟])\s+/g, '$1\n').split('\n').forEach(p => { p = p.trim(); if (!p) return; if (parts.length && (parts[parts.length - 1] + ' ' + p).length < 170) parts[parts.length - 1] += ' ' + p; else parts.push(p); });
  const L = [];
  parts.forEach(p => { while (p.length > 190) { let k = p.lastIndexOf(' ', 190); if (k < 60) k = 190; L.push(p.slice(0, k)); p = p.slice(k).trim(); } if (p) L.push(p); });
  return L;
}
async function ttsPart(q) {
  const f = path.join(CACHE, createHash('sha1').update(q).digest('hex') + '.mp3');
  if (existsSync(f)) return f;
  const urls = ['https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=ar&q=', 'https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q='];
  for (let a = 0; a < 8; a++) {
    try {
      const r = await fetch(urls[a % 2] + encodeURIComponent(q), {headers: {'User-Agent': 'Mozilla/5.0'}});
      if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > 500) { await writeFile(f, b); await sleep(250); return f; } }
    } catch {}
    await sleep(1500 * (a + 1));
  }
  throw new Error('تعذّر جلب الصوت للنص: ' + q);
}
/* ملف صوتي واحد لكل نص (مقاطعه متتالية) بالسرعة نفسها في المحاكي 0.95 */
async function tts(t, tmp) {
  const f = path.join(tmp, createHash('sha1').update(t).digest('hex') + '.wav');
  if (existsSync(f)) return {f, ms: dur(f) * 1000};
  const files = [];
  for (const q of chunks(t)) files.push(await ttsPart(q));
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...files.flatMap(x => ['-i', x]),
    '-filter_complex', files.map((_, i) => `[${i}:a]`).join('') + `concat=n=${files.length}:v=0:a=1,atempo=0.95,aresample=24000`, '-ac', '1', f]);
  return {f, ms: dur(f) * 1000};
}

await mkdir(CACHE, {recursive: true});
await mkdir(OUTD, {recursive: true});
const browser = await chromium.launch();
try {
  const page0 = await browser.newPage();
  await page0.route(/sw\.js$/, r => r.abort());
  await page0.goto(BASE + 'index.html', {waitUntil: 'load'});
  const all = await page0.evaluate(() => Object.keys(window.__wc.PNAME).filter(k => window.__wc.PRESETS[k]));
  await page0.close();
  const want = process.argv.slice(2);
  const list = want.length ? want.filter(k => all.includes(k)) : all;
  if (want.length && list.length !== want.length) throw new Error('تمرين غير معروف. المتاح: ' + all.join(' '));

  for (const ex of list) {
    const tmp = await mkdtemp(path.join(tmpdir(), 'clip-'));
    try {
      const page = await browser.newPage({viewport: {width: W, height: 1600}});
      page.on('pageerror', e => console.error('خطأ في الصفحة:', e.message));
      await page.route(/sw\.js$/, r => r.abort());
      await page.route(/qrcode.*\.js$/, r => r.fulfill({body: '', contentType: 'text/javascript'}));
      /* ساعة وهمية: يتقدّم الزمن إطارًا إطارًا فتتزامن الصورة مع الصوت مهما طال التصوير */
      await page.clock.install();
      await page.goto(BASE + 'index.html', {waitUntil: 'load'});
      await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
      /* في الفيديو: نافذة الشرح أعلى الصورة بعرضها كاملًا، واللوحة كاملة تحتها، دون أزرار المحاكي */
      await page.addStyleTag({content: `
        body>*:not(#wrap):not(#wcBar){display:none!important}
        .wtop,#wcBar .wcctl,#wcBar .wci,#wcBar #wcX,#wcBar .wcgrip{display:none!important}
        html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:var(--bg,#0f1724)}
        #wcBar{position:fixed!important;left:0!important;top:0!important;width:${W}px!important;max-width:none!important;box-sizing:border-box;border-radius:0!important;border-width:0 0 1px!important;box-shadow:none!important;padding:8px 14px 10px!important}
        #wcBar .wch b{font-size:1.15rem}#wcBar .wccap{font-size:1.05rem;line-height:1.55;min-height:4.7em;margin:4px 0 0}
        #wrap{margin:0!important;padding:0!important;width:${W}px!important;max-width:none!important;overflow:visible!important;height:auto!important}
        #svg{display:block;width:${W}px!important;height:auto!important;max-width:none!important}
        *{scroll-behavior:auto!important}
        .wchl{animation:none!important;opacity:.6!important}.wcht,.wcbt{animation:none!important;opacity:.9!important}`});
      await page.evaluate(() => document.fonts.ready);
      const info = await page.evaluate(ex => {
        const X = window.__wc;
        document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
        Element.prototype.scrollIntoView = function () {}; window.scrollBy = window.scrollTo = function () {};
        X.hook(); X.exPick(ex, true); try { X.exMotor(ex); } catch (_) {}
        X.wcStart(); const c = X.S.clip; c.play = false; clearTimeout(c.t); X.said.length = 0;
        return {name: X.PNAME[ex], n: c.steps.length, E: X.wcEnd(c)};
      }, ex);
      /* ارتفاع الصورة: أعلى نافذة شرح خلال المقطع كله (خطوات التوصيل، ثم كل خطوة من تجربة التشغيل مع سطر النتيجة) + اللوحة */
      const barH = await page.evaluate(n => {
        const X = window.__wc, c = X.S.clip, b = document.getElementById('wcBar'), cap = document.getElementById('wcCap'), hb = () => b.getBoundingClientRect().height;
        let h = 0;
        for (let i = 0; i <= n + 1; i++) { c.i = i > n ? X.wcEnd(c) : i; X.wcShow(); h = Math.max(h, hb()); }
        b.classList.add('demo');
        (X.DEMO[c.ex] || []).forEach(([, tx]) => { cap.innerHTML = '<span class="wcg">▶ تجربة التشغيل (ببرنامج easy النموذجي)</span><br>' + tx + '<span class="wcres">النتيجة: يعمل K1 و K2 · المحرك يعمل للأمام · مضاءة: H1 و H2</span>'; h = Math.max(h, hb()); });
        b.classList.remove('demo'); c.i = 0; X.wcShow(); X.said.length = 0; return Math.ceil(h);
      }, info.n);
      await page.addStyleTag({content: `#wcBar{height:${barH}px!important}#wrap{padding-top:${barH}px!important}`});
      const H = (Math.ceil(await page.evaluate(() => document.getElementById('svg').getBoundingClientRect().bottom)) + 1) & ~1;
      await page.setViewportSize({width: W, height: H});
      const clip = {x: 0, y: 0, width: W, height: H};

      let vt = 0, frame = 0, aEnd = 0;
      const audio = [];
      const say = async L => {
        for (const s of L) {
          const a = await tts(s.t, tmp), st = Math.max(vt, aEnd);
          audio.push({f: a.f, st}); aEnd = st + a.ms;
        }
      };
      const shot = async () => {
        const st = await page.evaluate(t => {
          document.getAnimations().forEach(a => { try { a.pause(); a.currentTime = t; } catch (_) {} });
          const X = window.__wc, c = X.S.clip, L = X.said.splice(0);
          return {said: L, busy: !!(c && c.busy)};
        }, vt);
        await say(st.said);
        await page.screenshot({clip, path: path.join(tmp, `${String(frame++).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 88});
        await page.clock.runFor(1000 / FPS); vt += 1000 / FPS;
        return st;
      };
      for (let i = 0; i <= info.E; i++) {
        if (i) await page.evaluate(i => { const X = window.__wc, c = X.S.clip; c.i = i; X.wcShow(); }, i);
        const t0 = vt, min = i === 0 ? 4000 : 2400, last = i === info.E;
        for (;;) {
          const st = await shot();
          if (vt - t0 >= min && !st.busy && vt >= aEnd + (last ? END_HOLD : GAP)) break;
          if (vt - t0 > 120000) throw new Error(`الخطوة ${i} لم تنتهِ`);
        }
        if (i % 10 === 0) console.log(`${ex}: ${i}/${info.E} (${(vt / 1000).toFixed(0)} ث)`);
      }
      await page.close();

      /* الصوت: كل جملة في موضعها من الزمن، والباقي صمت */
      const total = frame / FPS, wavs = [], lst = path.join(tmp, 'a.txt');
      let cur = 0, k = 0;
      const sil = ms => { if (ms < 1) return; const w = path.join(tmp, `s${k++}.wav`); execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', (ms / 1000).toFixed(3), w]); wavs.push(w); };
      for (const a of audio) { sil(a.st - cur); wavs.push(a.f); cur = a.st + dur(a.f) * 1000; }
      sil(total * 1000 - cur);
      await writeFile(lst, wavs.map(w => `file '${w}'`).join('\n'));
      const out = path.join(OUTD, `${ex}.mp4`);
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(tmp, '%06d.jpg'), '-f', 'concat', '-safe', '0', '-i', lst,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '32', '-tune', 'animation', '-g', String(FPS * 60), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.0',
        '-c:a', 'aac', '-b:a', '32k', '-ac', '1', '-movflags', '+faststart', '-shortest', out], {stdio: 'inherit'});
      console.log(`تم ${ex}: ${info.name} — ${info.n} سلكًا، ${dur(out).toFixed(0)} ث`);
    } finally { await rm(tmp, {recursive: true, force: true}); }
  }
} finally {
  await browser.close(); server.close();
}
