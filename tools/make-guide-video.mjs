/* يصنع فيديو «دليل الاستخدام» video/app-guide.mp4: تسجيل حي للتطبيق نفسه (المتدرب ثم المدرب) بمؤشر يتحرك ويضغط،
   مع كتابة مشكولة على الشاشة وتعليق صوتي بصوت حامد (ar-SA-HamedNeural).
   المتطلبات: Node، وplaywright مع Chromium، وffmpeg، وedge-tts (pip install edge-tts).
   الاستخدام:  SSL_CERT_FILE=… NODE_PATH=… node tools/make-guide-video.mjs
   متغيرات اختيارية: DRY=1 (بلا صوت، مدة ثابتة لكل مشهد، للتجربة السريعة)، SHOTS=مجلد (صورة في آخر كل مشهد)
   خادم Google مُحاكى داخل الأداة: ما يرسله المتدرب في الفيديو يظهر عند المدرب في «نتائج المتدربين». */
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile, mkdtemp, rm, readdir} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
import {execFileSync, execFile} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {chromium} = createRequire(import.meta.url)('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'video', 'app-guide.mp4');
const W = 1280, H = 720, VOICE = process.env.VOICE || 'ar-SA-HamedNeural', DRY = !!process.env.DRY, SHOTS = process.env.SHOTS || '';
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json'};
const server = createServer(async (req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT)) return res.writeHead(403).end();
  try { const b = await readFile(f); res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'}).end(b); }
  catch { res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dur = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
const tts = (text, file) => new Promise((ok, no) => execFile('edge-tts', ['--voice', VOICE, '--rate=-4%', '--text', text, '--write-media', file, ...(process.env.HTTPS_PROXY ? ['--proxy', process.env.HTTPS_PROXY] : [])], {timeout: 90000}, e => e ? no(e) : ok()));

/* ---------------- the narration (with full diacritics: shown on screen and read by the voice) ---------------- */
const SC = [
 {t: 'أَهْلًا بِكَ فِي مُحَاكِي وَرْشَةِ التَّحَكُّمِ فِي الْمُحَرِّكَاتِ الْكَهْرَبَائِيَّةِ. فِي هَذَا الْمَقْطَعِ نَتَعَرَّفُ عَلَى طَرِيقَةِ اسْتِخْدَامِ التَّطْبِيقِ لِلْمُتَدَرِّبِ وَالْمُدَرِّبِ، خُطْوَةً بِخُطْوَةٍ.', run: 'intro'},
 {t: 'يَبْدَأُ الْمُتَدَرِّبُ بِكِتَابَةِ اسْمِهِ وَرَقْمِهِ التَّدْرِيبِيِّ فِي أَعْلَى الشَّاشَةِ. يُحْفَظَانِ عَلَى الْجِهَازِ، وَيُرْسَلَانِ مَعَ كُلِّ تَمْرِينٍ إِلَى الْمُدَرِّبِ.', run: 'name'},
 {t: 'ثُمَّ يَخْتَارُ التَّمْرِينَ مِنْ هَذِهِ الْقَائِمَةِ، فَتُضَافُ الْقِطَعُ اللَّازِمَةُ إِلَى اللَّوْحَةِ تِلْقَائِيًّا، وَيُقَيَّمُ هَذَا التَّمْرِينُ نَفْسُهُ عِنْدَ الْإِرْسَالِ.', run: 'pick'},
 {t: 'زِرُّ «مَقْطَعِ التَّوْصِيلِ» يَعْرِضُ تَوْصِيلَ التَّمْرِينِ سِلْكًا سِلْكًا عَلَى اللَّوْحَةِ نَفْسِهَا بِالصَّوْتِ، وَعِنْدَ إِغْلَاقِهِ تَعُودُ لَوْحَتُكَ كَمَا كَانَتْ.', run: 'clip'},
 {t: 'لِتَمْدِيدِ سِلْكٍ اضْغَطْ عَلَى طَرَفٍ، ثُمَّ عَلَى الطَّرَفِ الْآخَرِ. وَزِرُّ «تَرَاجُعٍ» فِي الْأَسْفَلِ يُلْغِي آخِرَ خُطْوَةٍ.', run: 'wire'},
 {t: 'فِي الشَّرِيطِ السُّفْلِيِّ: «الْمُخَطَّطُ» يَعْرِضُ دَائِرَتَيِ الْقُوَى وَالتَّحَكُّمِ لِلتَّمْرِينِ، وَ«الْأَسْلَاكُ» لِاخْتِيَارِ لَوْنِ السِّلْكِ، وَ«الْمُكَوِّنَاتُ» لِإِضَافَةِ الْقِطَعِ، وَ«الْمِلْتِيمِتَرُ» لِلْقِيَاسِ، ثُمَّ «الْحَذْفُ».', run: 'dock'},
 {t: 'بَعْدَ إِكْمَالِ التَّوْصِيلِ جَرِّبْ لَوْحَتَكَ: اضْغَطْ ضَاغِطَ التَّشْغِيلِ فَيَدُورُ الْمُحَرِّكُ وَتُضِيءُ اللَّمْبَةُ، وَاضْغَطْ ضَاغِطَ الْإِيقَافِ فَيَتَوَقَّفُ.', run: 'run'},
 {t: 'وَعَلَى جَانِبِ اللَّوْحَةِ زِرُّ الْأَشِعَّةِ لِرُؤْيَةِ الْأَجْزَاءِ الدَّاخِلِيَّةِ لِلْقِطَعِ، وَزِرُّ «الْمَقْطَعِ الْعَرْضِيِّ» لِشَرْحِ أَيِّ قِطْعَةٍ مِنَ الدَّاخِلِ.', run: 'side'},
 {t: 'عِنْدَ الِانْتِهَاءِ اضْغَطْ «تَقْيِيمٌ وَإِرْسَالٌ». يُقَيِّمُ التَّطْبِيقُ تَوْصِيلَكَ مِنْ عِشْرِينَ، وَيُشَغِّلُ لَوْحَتَكَ آلِيًّا، وَيُرِيكَ أَخْطَاءَكَ إِنْ وُجِدَتْ.', run: 'grade'},
 {t: 'بَعْدَ حَلِّ الِاخْتِبَارِ النَّظَرِيِّ اضْغَطِ الْإِرْسَالَ، وَاخْتَرْ مُدَرِّبَكَ فِي أَوَّلِ مَرَّةٍ، فَتَصِلُ تَجْرِبَتُكَ إِلَيْهِ مَعَ دَرَجَتِكَ وَصُورَةِ لَوْحَتِكَ.', run: 'send'},
 {t: 'وَزِرُّ «تَمَارِينِي» يَحْفَظُ نُسْخَتَكَ مِنْ كُلِّ تَمْرِينٍ وَصَّلْتَهُ، فَتَفْتَحُهَا وَتُكْمِلُ عَلَيْهَا مَتَى شِئْتَ.', run: 'work'},
 {t: 'وَفِي أَعْلَى الشَّاشَةِ: التَّعْرِيفُ بِالْمُحَاكِي، وَوَرْشَةُ النِّيُومَاتِيكِ، وَشَنْطَةُ اكْتِشَافِ الْأَعْطَالِ، وَخَطُّ الْإِنْتَاجِ، وَالشَّرْحُ، وَمِلْءُ الشَّاشَةِ.', run: 'top'},
 {t: 'كُلٌّ مِنْهَا يُفْتَحُ دَاخِلَ التَّطْبِيقِ نَفْسِهِ، وَزِرُّ «رُجُوعٍ» يُعِيدُكَ إِلَى لَوْحَتِكَ كَمَا تَرَكْتَهَا.', run: 'pneu'},
 {t: 'وَقَائِمَةُ النِّقَاطِ الثَّلَاثِ فِيهَا: تَقْيِيمُ اسْتِفَادَتِكَ مِنَ التَّطْبِيقِ، وَبَارْكُودُ دُخُولِ الْمُتَدَرِّبِينَ، وَوَضْعُ الْمُدَرِّبِ.', run: 'menu'},
 {t: 'يَدْخُلُ الْمُدَرِّبُ مِنْ «وَضْعِ الْمُدَرِّبِ» بِاسْمِ الْمُسْتَخْدِمِ وَالرَّقْمِ السِّرِّيِّ. وَالْمُدَرِّبُ الْجَدِيدُ يُسَجِّلُ نَفْسَهُ مِنْ هُنَا، ثُمَّ يَنْتَظِرُ مُوَافَقَةَ مُدِيرِ النِّظَامِ.', run: 'login'},
 {t: 'فِي وَضْعِ الْمُدَرِّبِ تَظْهَرُ أَدَوَاتٌ إِضَافِيَّةٌ، مِنْهَا قَائِمَةُ التَّمَارِينِ الْجَاهِزَةِ، تُحَمِّلُ تَوْصِيلَ أَيِّ تَمْرِينٍ كَامِلًا لِلشَّرْحِ أَمَامَ الْمُتَدَرِّبِينَ.', run: 'tools'},
 {t: 'وَفِي «نَتَائِجِ الْمُتَدَرِّبِينَ» يَرَى الْمُدَرِّبُ تَجَارِبَ مُتَدَرِّبِيهِ فَقَطْ وَدَرَجَاتِهِمْ، وَيَرْصُدُهَا، وَيُنَزِّلُهَا مِلَفًّا يُفْتَحُ فِي إِكْسِلْ.', run: 'results'},
 {t: 'وَيَفْتَحُ تَوْصِيلَ أَيِّ مُتَدَرِّبٍ عَلَى اللَّوْحَةِ لِيَطَّلِعَ عَلَيْهِ، وَيُعَدِّلُ دَرَجَتَهُ يَدَوِيًّا إِذَا احْتَاجَ إِلَى ذَلِكَ.', run: 'open'},
 {t: 'وَمِنَ الْقَائِمَةِ يُفَعِّلُ الْمُدَرِّبُ قَفْلَ التَّمْرِينِ بَعْدَ إِرْسَالِهِ أَوْ يُلْغِيهِ، فَإِذَا فَعَّلَهُ لَا يُعَدِّلُ الْمُتَدَرِّبُ تَمْرِينًا أَرْسَلَهُ وَلَا يُعِيدُ إِرْسَالَهُ.', run: 'lock'},
 {t: 'وَبَارْكُودُ الدُّخُولِ يَرْبِطُ الْمُتَدَرِّبِينَ بِحِسَابِ مُدَرِّبِهِمْ مُبَاشَرَةً. وَلِلْخُرُوجِ اضْغَطِ «الْخُرُوجَ مِنْ وَضْعِ الْمُدَرِّبِ».', run: 'exit'},
 {t: 'بِهَذَا تَعَرَّفْتَ عَلَى أَهَمِّ اسْتِخْدَامَاتِ التَّطْبِيقِ. نَتَمَنَّى لَكَ تَدْرِيبًا مُمْتِعًا وَمُفِيدًا.', run: 'end'}];

/* ---------------- a stand-in for the Google results server: what the trainee sends reaches the trainer ---------------- */
const SUBS = [{uid: 'a1b2c3d4', t: Date.now() - 3600e3, n: 'خالد سعيد', id: '1042', ex: 'p2', s: 18, code: '', th: '', tr: 'ahmed', rasd: true, man: '', mn: ''}];
let LOCK = false;
function gas(d) {
  const a = d.action;
  if (a === 'submit') { const uid = Math.random().toString(16).slice(2, 10); SUBS.push({uid, t: Date.now(), n: d.n, id: d.id, ex: d.ex, s: d.s, code: d.code || '', th: d.th || '', tr: d.tr || '', rasd: false, man: '', mn: ''}); return {ok: true, uid}; }
  if (a === 'trNames') return {ok: true, list: [{u: 'ahmed', n: 'م. أحمد علي'}]};
  if (a === 'trLogin') return d.u === 'ahmed' && d.pin === '2468' ? {ok: true, u: 'ahmed', n: 'م. أحمد علي', admin: false, url: '', furl: ''} : {ok: false, err: 'pin', msg: 'اسم المستخدم أو الرقم السري غير صحيح'};
  if (a === 'who') return {ok: true, admin: false, tr: 'ahmed', n: 'م. أحمد علي', lk: LOCK};
  if (a === 'list') return {ok: true, admin: false, n: SUBS.length, rows: SUBS};
  if (a === 'lkGet') return {ok: true, lk: false, ex: []};
  if (a === 'lkSet') { LOCK = !!d.on; return {ok: true, lk: LOCK}; }
  if (a === 'rates') return {ok: true, rows: []};
  if (a === 'pinCheck') return {ok: false, err: 'pin'};
  if (a === 'img') return {ok: false, err: 'notfound'};
  return {ok: true};
}

/* ---------------- the pointer, its tap, and the caption, drawn over the app ---------------- */
const OVERLAY = () => { if (window !== top) return; addEventListener('DOMContentLoaded', () => {
  const st = document.createElement('style');
  st.textContent = `#gPtr{position:fixed;left:-60px;top:-60px;width:34px;height:34px;z-index:2147483647;pointer-events:none;transition:left .7s cubic-bezier(.4,.1,.2,1),top .7s cubic-bezier(.4,.1,.2,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
  #gPtr svg{width:34px;height:34px;transform:translate(-6px,-3px)}#gRip{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #ffb300;z-index:2147483646;pointer-events:none;opacity:0}
  #gRip.on{animation:gr .6s ease-out}@keyframes gr{0%{opacity:1;transform:scale(.6)}100%{opacity:0;transform:scale(3.4)}}
  #gCap{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);max-width:88%;z-index:2147483645;pointer-events:none;direction:rtl;text-align:center;background:rgba(8,22,44,.9);color:#fff;font:600 23px/1.95 'Noto Naskh Arabic','Amiri','Noto Sans Arabic',Tahoma,sans-serif;padding:8px 22px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.18);box-shadow:0 6px 24px rgba(0,0,0,.35);transition:opacity .3s}
  #gCap:empty{opacity:0}#gHi{position:fixed;z-index:2147483644;pointer-events:none;border:3px solid #ffb300;border-radius:12px;box-shadow:0 0 0 4px rgba(255,179,0,.25);opacity:0;transition:all .45s}`;
  document.head.appendChild(st);
  const p = document.createElement('div'); p.id = 'gPtr'; p.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 2l14 11-6.2 1 3.6 7-2.6 1.3-3.6-7L5 20z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const r = document.createElement('div'); r.id = 'gRip'; const c = document.createElement('div'); c.id = 'gCap'; const h = document.createElement('div'); h.id = 'gHi';
  document.body.append(h, c, r, p);
  window.__g = {
    move: (x, y) => { p.style.left = x + 'px'; p.style.top = y + 'px'; },
    tap: () => { r.style.left = p.style.left; r.style.top = p.style.top; r.classList.remove('on'); void r.offsetWidth; r.classList.add('on'); },
    cap: t => { c.textContent = t; },
    hi: b => { if (!b) { h.style.opacity = 0; return; } Object.assign(h.style, {left: b.x - 5 + 'px', top: b.y - 5 + 'px', width: b.width + 10 + 'px', height: b.height + 10 + 'px', opacity: 1}); }};
}); };

const tmp = await mkdtemp(path.join(tmpdir(), 'guide-'));
try {
  /* 1. the voice of every scene */
  for (let i = 0; i < SC.length; i++) {
    if (DRY) { SC[i].len = 5; continue; }
    const f = path.join(tmp, `v${i}.mp3`);
    for (let k = 0; ; k++) { try { await tts(SC[i].t, f); break; } catch (e) { if (k > 3) throw e; await sleep(2000 * (k + 1)); } }
    SC[i].mp3 = f; SC[i].len = dur(f); console.log(`صوت ${i + 1}/${SC.length}: ${SC[i].len.toFixed(1)} ث`);
  }
  /* 2. the live recording */
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: W, height: H}, recordVideo: {dir: tmp, size: {width: W, height: H}}, serviceWorkers: 'block', locale: 'ar'});
  await ctx.route('https://script.google.com/**', async rt => { let d = {}; try { d = JSON.parse(rt.request().postData() || '{}'); } catch {} await sleep(350); rt.fulfill({body: JSON.stringify(gas(d)), contentType: 'application/json', headers: {'access-control-allow-origin': '*'}}); });
  await ctx.route(/cdnjs\.cloudflare\.com/, rt => rt.abort());
  await ctx.addInitScript(OVERLAY);
  const tRec = Date.now();
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('خطأ في الصفحة:', e.message));
  page.on('dialog', d => d.accept());
  await page.goto(BASE + 'index.html', {waitUntil: 'load'});
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.fonts.ready);
  const closeModals = () => page.evaluate(() => document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')));
  await closeModals();

  /* helpers: move the pointer to an element, highlight it, click it like a person */
  const box = async t => { const l = typeof t === 'string' ? page.locator(t).first() : t; try { await l.scrollIntoViewIfNeeded({timeout: 1500}); } catch {} return l.boundingBox().catch(() => null); };
  const pt = async (t, {click = true, dwell = 450, hi = true} = {}) => {
    const b = await box(t); if (!b) { console.log('لم يُعثر على', String(t)); return false; }
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.evaluate(([x, y, b, hi]) => { __g.move(x, y); __g.hi(hi ? b : null); }, [x, y, b, hi]); await page.waitForTimeout(800);
    if (click) { await page.evaluate(() => __g.tap()); await page.mouse.click(x, y); }
    await page.waitForTimeout(dwell); await page.evaluate(() => __g.hi(null)); return true; };
  const typeIn = async (sel, text) => { await pt(sel); for (const ch of text) { await page.evaluate(([s, ch]) => { const e = document.querySelector(s); e.value += ch; e.dispatchEvent(new Event('input', {bubbles: true})); }, [sel, ch]); await page.waitForTimeout(110); }
    await page.evaluate(s => document.querySelector(s).dispatchEvent(new Event('change', {bubbles: true})), sel); };
  const setSel = (sel, v) => page.evaluate(([s, v]) => { const e = document.querySelector(s); if (![...e.options].some(o => o.value === v)) { const o = document.createElement('option'); o.value = v; e.appendChild(o); } e.value = v; e.dispatchEvent(new Event('change', {bubbles: true})); }, [sel, v]);
  const more = async open => { await page.evaluate(o => { const d = document.querySelector('.more'); if (d) d.open = o; }, open); await page.waitForTimeout(350); };
  const wait = ms => page.waitForTimeout(ms);

  const ACT = {
    intro: async () => { await page.evaluate(() => __g.move(640, 380)); await wait(1200); await pt('h1', {click: false, dwell: 1200}); await pt('#dSd', {click: false, dwell: 800}); },
    name: async () => { await typeIn('#stName', 'سعد محمد'); await typeIn('#stId', '2051'); },
    pick: async () => { await pt('#exPick', {click: false, dwell: 600}); await setSel('#exPick', 'p1'); await wait(900); await closeModals(); },
    clip: async () => { await pt('#exClip'); await wait(9000); await pt('#wcX'); await closeModals(); },
    wire: async () => { await pt('[data-term="F1.2"]', {dwell: 300}); await pt('[data-term="XP.I1"]', {dwell: 1400}); await pt('#dUndo', {dwell: 900}); },
    dock: async () => { await pt('#dSd', {dwell: 2500}); await pt('#dSd', {dwell: 300}); await page.evaluate(() => { const x = [...document.querySelectorAll('button')].find(b => b.offsetParent && /^\s*✕\s*$/.test(b.textContent) && b.closest('[id^=sd],.sdw,.sdwin')); if (x) x.click(); });
      await pt('#dCol', {dwell: 1100}); await page.mouse.click(5, 300); await wait(200); await pt('#dParts', {dwell: 1300}); await page.evaluate(() => { const x = document.getElementById('pPopX'); if (x) x.click(); });
      await pt('#dMM', {click: false, dwell: 700}); await pt('#dDelM', {click: false, dwell: 700}); },
    side: async () => { await pt('#xrTab', {dwell: 2500}); await pt('#xrTab', {dwell: 400}); await pt('#xsTab', {click: false, dwell: 800}); },
    run: async () => { await setSel('#dPreset', 'p1'); await wait(500); await closeModals();
      await pt('[data-press="S1"]', {dwell: 600}); await pt('[data-act="snd:M1"]', {click: false, dwell: 2600}); await pt('[data-press="S0"]', {dwell: 900}); },
    grade: async () => { await pt('#bGrade', {dwell: 2500}); await page.evaluate(() => document.getElementById('gBody').scrollBy({top: 260, behavior: 'smooth'})); await wait(1500); },
    send: async () => { await page.evaluate(() => { const seen = new Set(); document.querySelectorAll('#gBody [data-qz]').forEach(r => { const k = r.dataset.qz; if (seen.has(k)) return; seen.add(k); r.checked = true; r.dispatchEvent(new Event('change', {bubbles: true})); }); });
      if (await page.locator('#qzGo').count()) await pt('#qzGo', {dwell: 700}); await pt('#gSend', {dwell: 700}); await pt('#sCloud', {dwell: 900});
      if (await page.locator('#trPickM.open').count()) { await pt('#trPickS', {dwell: 300}); await page.evaluate(() => { const s = document.getElementById('trPickS'); s.value = s.options[s.options.length > 1 ? 1 : 0].value; s.dispatchEvent(new Event('change', {bubbles: true})); }); await pt('#trPickOk', {dwell: 300}); }
      await wait(3500); await closeModals(); },
    work: async () => { await pt('#bWork', {dwell: 2600}); await pt('#wkClose', {dwell: 300}); },
    top: async () => { for (const id of ['#bVid', '#bPneu', '#bFault', '#bLine2', '#bHelp', '#bFS']) await pt(id, {click: false, dwell: 350}); },
    pneu: async () => { await pt('#bPneu', {dwell: 3800}); const back = page.frameLocator('#pnOverlay iframe').locator('button:has-text("رجوع"), a:has-text("رجوع")').first(); if (!(await pt(back, {dwell: 600}))) await page.evaluate(() => window.__pnClose && window.__pnClose()); },
    menu: async () => { await pt('.more summary', {click: false, dwell: 100}); await more(true); for (const id of ['#bRate', '#bQR2', '#bTrainer']) await pt(id, {click: false, dwell: 450}); },
    login: async () => { await pt('#bTrainer', {dwell: 600}); await typeIn('#pinU', 'ahmed'); await typeIn('#pinIn', '2468'); await pt('#trRegB', {click: false, dwell: 900}); await pt('#pinOk', {dwell: 2000}); await closeModals(); },
    tools: async () => { await pt('#dPreset', {click: false, dwell: 500}); await setSel('#dPreset', 'p3'); await wait(1800); await closeModals(); },
    results: async () => { await more(true); await pt('#bResults', {dwell: 2600}); await page.evaluate(() => document.querySelectorAll('details.rgrp').forEach(d => d.open = true)); await wait(1200); await pt('[data-rseen]', {dwell: 900}); },
    open: async () => { await pt('[data-rman]', {click: false, dwell: 900}); await pt('[data-ropen]', {dwell: 2200}); await closeModals(); await pt('[data-stuman]', {click: false, dwell: 1500}); },
    lock: async () => { await more(true); await pt('#bLock', {dwell: 2200}); await more(true); await pt('#bLock', {dwell: 1200}); },
    exit: async () => { await more(true); await pt('#bQR2', {click: false, dwell: 1300}); await page.evaluate(() => { const b = document.querySelector('[data-stux]'); if (b) b.click(); }); await pt('#bTrainer', {dwell: 1500}); },
    end: async () => { await closeModals(); await page.evaluate(() => __g.move(1240, 60)); }};

  const marks = [];
  const t0 = Date.now();
  for (let i = 0; i < SC.length; i++) {
    const s = SC[i];
    await page.evaluate(t => __g.cap(t), s.t);
    const start = Date.now() - tRec; marks.push(start);
    const act = ACT[s.run]().catch(e => console.log('مشهد', i + 1, e.message.split('\n')[0]));
    await Promise.all([act, sleep(s.len * 1000 + 700)]);
    if (SHOTS) { mkdirSync(SHOTS, {recursive: true}); await page.screenshot({path: path.join(SHOTS, `s${String(i + 1).padStart(2, '0')}.png`)}); }
    console.log(`مشهد ${i + 1}/${SC.length} (${s.run}): ${((Date.now() - tRec - start) / 1000).toFixed(1)} ث`);
  }
  await page.evaluate(() => __g.cap('')); await wait(1500);
  const vid = await page.video().path(); await ctx.close(); await browser.close();
  /* 3. the video with its voice track */
  const ss = Math.max(0, marks[0] - 400) / 1000, args = ['-y', '-ss', ss.toFixed(2), '-i', vid];
  const parts = SC.map((s, i) => ({f: s.mp3, d: Math.round(marks[i] - ss * 1000 + 250)})).filter(p => p.f);
  parts.forEach(p => args.push('-i', p.f));
  const fc = parts.map((p, i) => `[${i + 1}]adelay=${p.d}|${p.d}[a${i}]`).join(';') + (parts.length ? `;${parts.map((_, i) => `[a${i}]`).join('')}amix=inputs=${parts.length}:normalize=0[a]` : '');
  if (parts.length) args.push('-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '96k'); else args.push('-an');
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', '25', '-movflags', '+faststart', OUT);
  execFileSync('ffmpeg', args, {stdio: 'ignore'});
  console.log(`تم: ${OUT} (${dur(OUT).toFixed(0)} ث)`);
} finally { server.close(); await rm(tmp, {recursive: true, force: true}); }
