/* يسجّل بصوت «حامد» كل جمل مقاطع الشرح في المحاكي الهوائي (pneumatic.html) وشنطة الأعطال (troubleshoot.html)،
   لكل جملة ملف audio/c/<بصمة الجملة>.mp3، وفهرسها audio/c/index.json. المقطع يشغّل ملف كل جملة، وما ليس له ملف
   يُنطق بصوت الجهاز العربي. يُعاد تشغيله بعد أي تعديل على نصوص المقاطع أو تمارينها.
   المتطلبات: Node، وحزمة playwright مع Chromium، وأداة edge-tts (pip install edge-tts)، واتصال يصل إلى speech.platform.bing.com
   الاستخدام:  node tools/make-clip-voice.mjs
   يُصنع ملف الجمل الجديدة فقط، ويحذف ملفات الجمل التي لم تعد في المقاطع.
   النص المنطوق يمر بقواعد النطق نفسها في المحاكي الكهربائي (spkText في index.html) مع تشكيل الكلمات الفنية.
   متغيرات اختيارية: VOICE (الافتراضي ar-SA-HamedNeural)، JOBS (عدد التسجيلات معًا، الافتراضي 4) */
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile, writeFile, readdir, mkdir, rm, rename} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFile} from 'node:child_process';
import path from 'node:path';
const {chromium} = createRequire(import.meta.url)('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'audio', 'c');
const VOICE = process.env.VOICE || 'ar-SA-HamedNeural', JOBS = +process.env.JOBS || 4;

/* منفذ صغير داخل شيفرة كل صفحة للوصول إلى المقاطع وقواعد النطق */
const HOOK = {
  'pneumatic.html': 'window.__c={get S(){return S;},EX,pnClip,clStep,clClose,clSent,clHash};',
  'troubleshoot.html': 'window.__c={get S(){return S;},CIRC,ORDER,setCircuit,ftClip,clStep,clClose};',
  'index.html': 'window.__c={spkText};'};
const server = createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\//, '') || 'index.html', f = path.join(ROOT, name);
  if (!f.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    let b = await readFile(f);
    if (HOOK[name]) {
      /* نهاية الشيفرة الرئيسية: أول «})();» في index.html (بعدها شيفرات أخرى)، وآخرها في الصفحتين الأخريين */
      const s = b.toString(), k = name === 'index.html' ? s.indexOf('\n})();\n') : s.lastIndexOf('\n})();\n');
      if (k < 0) throw new Error('لم يُعثر على نهاية الشيفرة في ' + name);
      b = s.slice(0, k) + '\n' + HOOK[name] + '\n})();\n' + s.slice(k + 7);
    }
    res.writeHead(200, {'Content-Type': name.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream'}).end(b);
  } catch { res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* كل ما يقوله مقطع: نص كل خطوة كما يُنطق، والخطوات التي تنتظر حدثًا على اللوحة تُنتظر حتى يحدث */
async function collect(page, list) {
  const said = [];
  for (const start of list) {
    const n = await page.evaluate(start, null);
    for (let j = 0; j < n; j++) {
      const st = await page.evaluate(j => {const c = window.__c; c.clStep(j, true); const cl = c.S.cl; cl.tok++; clearTimeout(cl.t); const s = cl.steps[j]; return {t: (s.k ? s.k + '. ' : '') + s.tx, til: !!s.til};}, j);
      said.push(st.t);
      if (st.til) {const t0 = Date.now(); while (Date.now() - t0 < 25000 && !await page.evaluate(j => window.__c.S.cl.steps[j].til(), j)) await sleep(150);}
    }
    await page.evaluate(() => window.__c.clClose(false));
  }
  return said;
}

/* نطق الرموز التي لا تعرفها قواعد المحاكي الكهربائي */
const pre = t => t.replace(/[\u2066-\u2069]/g, '').replace(/\s+:\s+(?=\d)/g, ' ')
  .replace(/\b(\d)([AVSZ])(\d*)\b/g, (m, a, l, b) => a + ' ' + {A: 'إيه', V: 'في', S: 'إس', Z: 'زِد'}[l] + (b ? ' ' + b : ''))
  .replace(/\bK(\d+)T\b/g, 'كيه $1 تي').replace(/\bP(\d)\b/g, 'بي $1').replace(/\b(\d)\/(\d)\b/g, '$1 على $2')
  .replace(/(\d+(?:\.\d+)?)\s*kΩ/g, '$1 كيلو أوم').replace(/(\d+(?:\.\d+)?)\s*Ω/g, '$1 أوم').replace(/\bOL\b/g, 'أو إل').replace(/\b0V\b/g, 'صفر فولت')
  .replace(/\b([AB])\+/g, '$1 زائد').replace(/\b([AB])−/g, '$1 ناقص').replace(/\bA\b/g, 'إيه').replace(/\bB\b/g, 'بي').replace(/\bOR\b/g, 'أور').replace(/\bAND\b/g, 'آند').replace(/[×✋📍🎲]/g, ' ');

const tts = (text, file) => new Promise((ok, no) => execFile('edge-tts', ['--voice', VOICE, '--rate=-5%', '--text', text, '--write-media', file,
  ...(process.env.HTTPS_PROXY ? ['--proxy', process.env.HTTPS_PROXY] : [])], {timeout: 90000}, e => e ? no(e) : ok()));

const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport: {width: 1280, height: 900}});
  page.on('pageerror', e => console.error('خطأ في الصفحة:', e.message));
  await page.goto(BASE + 'pneumatic.html'); await sleep(800);
  const nEx = await page.evaluate(() => window.__c.EX.length);
  const said = await collect(page, [...Array(nEx).keys()].map(i => new Function(`const c=window.__c;c.pnClip(${i});const cl=c.S.cl;cl.play=false;cl.snd=false;cl.tok++;clearTimeout(cl.t);return cl.steps.length;`)));
  await page.goto(BASE + 'troubleshoot.html'); await sleep(800);
  const ids = await page.evaluate(() => window.__c.ORDER.filter(i => window.__c.CIRC[i]));
  said.push(...await collect(page, ids.map(id => new Function(`const c=window.__c;c.setCircuit('${id}');c.ftClip();const cl=c.S.cl;cl.play=false;cl.snd=false;cl.tok++;clearTimeout(cl.t);return cl.steps.length;`))));
  /* الجمل كما يقسمها المقطع وبصماتها، ثم نصها المنطوق بقواعد النطق في المحاكي الكهربائي */
  await page.goto(BASE + 'pneumatic.html'); await sleep(500);
  const S = await page.evaluate(L => {const m = {}; L.forEach(t => window.__c.clSent(t.replace(/\s+/g, ' ')).forEach(s => {m[window.__c.clHash(s)] = s;})); return m;}, said);
  await page.goto(BASE + 'index.html'); await sleep(800);
  const spoken = await page.evaluate(([S, pre]) => {const f = new Function('t', 'return (' + pre + ')(t);'), o = {}; for (const h in S) o[h] = window.__c.spkText(f(S[h])); return o;}, [S, pre.toString()]);
  const hs = Object.keys(spoken).sort();
  await mkdir(OUT, {recursive: true});
  const todo = hs.filter(h => !existsSync(path.join(OUT, h + '.mp3')));
  console.log(`${said.length} خطوة، ${hs.length} جملة، الجديد منها ${todo.length}`);
  let done = 0, failed = 0;
  const work = async () => {while (todo.length) {const h = todo.shift(), f = path.join(OUT, h + '.mp3'), tmp = f + '.part';
    for (let k = 0; k < 3; k++) {try {await tts(spoken[h], tmp); await rename(tmp, f); break;} catch (e) {if (k === 2) {failed++; console.error('تعذّر تسجيل:', S[h]);} else await sleep(2000);}}
    if (++done % 25 === 0) console.log(`  ${done}…`);}};
  await Promise.all([...Array(JOBS)].map(work));
  /* الفهرس: الجمل التي لها ملف فقط، وتُحذف ملفات الجمل التي لم تعد في المقاطع */
  const have = hs.filter(h => existsSync(path.join(OUT, h + '.mp3'))), keep = new Set(have);
  for (const f of await readdir(OUT)) if (/\.mp3(\.part)?$/.test(f) && !keep.has(f.replace(/\.mp3(\.part)?$/, ''))) await rm(path.join(OUT, f));
  await writeFile(path.join(OUT, 'index.json'), JSON.stringify(have));
  console.log(`انتهى: ${have.length} ملفًا في audio/c/` + (failed ? `، وتعذّر ${failed}` : ''));
} finally {await browser.close(); server.close();}
