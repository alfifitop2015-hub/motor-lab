/* يصنع ملف الفيديو التعريفي video/motor-lab-intro.mp4 من مشاهد المحاكي نفسها وتسجيلات audio/*.mp3
   ويُعاد تشغيله بعد أي تعديل على مشاهد الفيديو أو تسجيلاتها.
   المتطلبات: Node، وحزمة playwright مع Chromium، وffmpeg.
   الاستخدام:  node tools/make-intro-video.mjs
   متغيرات اختيارية: QR_LIB=مسار qrcode.js محلي (إن تعذّر الوصول إلى cdnjs)، FPS (الافتراضي 30)، LAST_HOLD (مدة مشهد الباركود، 14 ثانية) */
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile, mkdtemp, rm, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
/* require يقبل NODE_PATH فيعمل مع playwright المثبّت عامًا */
const {chromium} = createRequire(import.meta.url)('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'video', 'motor-lab-intro.mp4');
const FPS = +process.env.FPS || 30, GAP = .9, LAST_HOLD = +process.env.LAST_HOLD || 14, W = 1280, H = 720;
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.png': 'image/png', '.webmanifest': 'application/manifest+json'};

const server = createServer(async (req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT)) return res.writeHead(403).end();
  try { const b = await readFile(f); res.writeHead(200, {'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream'}).end(b); }
  catch { res.writeHead(404).end(); }
}).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}/`;

const dur = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
const tmp = await mkdtemp(path.join(tmpdir(), 'intro-'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport: {width: W + 120, height: H + 400}});
  if (process.env.QR_LIB) await page.route(/qrcode-generator.*qrcode\.min\.js$/, r => r.fulfill({path: process.env.QR_LIB, contentType: 'text/javascript'}));
  await page.route(/sw\.js$/, r => r.abort());
  /* ساعة وهمية: مؤقتات المشغّل لا تتقدّم وحدها، فنتحكّم في كل إطار */
  await page.clock.install();
  await page.goto(BASE + 'index.html', {waitUntil: 'load'});
  await page.addStyleTag({content: `#vidModal .vbox{width:${W}px!important;max-width:none!important;min-width:0!important}#vidModal .vstage{width:${W}px;height:${H}px}`});
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); document.getElementById('bVid').click(); document.getElementById('vMute').click(); });
  const n = await page.locator('#vProg .vseg').count();
  const bx = await page.locator('#vidModal .vstage').boundingBox(), clip = {x: Math.round(bx.x), y: Math.round(bx.y), width: W, height: H};
  let frame = 0;
  const parts = [];
  for (let k = 0; k < n; k++) {
    const mp3 = path.join(ROOT, 'audio', `${k + 1}.mp3`);
    const quiet = k === n - 1 || !existsSync(mp3);
    const len = quiet ? LAST_HOLD : Math.max(7, dur(mp3)) + GAP;
    parts.push({mp3: quiet ? null : mp3, len});
    await page.evaluate(k => { document.querySelector(`#vProg .vseg[data-k="${k}"]`).click(); document.getAnimations().forEach(a => a.pause()); }, k);
    const frames = Math.round(len * FPS);
    for (let i = 0; i < frames; i++) {
      await page.evaluate(t => document.querySelectorAll('#vArt').forEach(el => el.getAnimations({subtree: true}).forEach(a => { a.currentTime = t; })), i * 1000 / FPS);
      await page.screenshot({clip, path: path.join(tmp, `${String(frame++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95});
    }
    console.log(`مشهد ${k + 1}/${n}: ${len.toFixed(1)} ث`);
  }
  /* الصوت: تسجيل كل مشهد مع صمت يكمل مدته */
  const wavs = [];
  for (const [i, p] of parts.entries()) {
    const w = path.join(tmp, `a${i}.wav`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', ...(p.mp3 ? ['-i', p.mp3] : ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono']),
      '-af', `aresample=44100,apad`, '-ac', '1', '-t', String(Math.round(p.len * FPS) / FPS), w]);
    wavs.push(w);
  }
  const list = path.join(tmp, 'list.txt');
  await (await import('node:fs/promises')).writeFile(list, wavs.map(w => `file '${w}'`).join('\n'));
  await mkdir(path.dirname(OUT), {recursive: true});
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(tmp, '%05d.jpg'), '-f', 'concat', '-safe', '0', '-i', list,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.0',
    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-shortest', OUT], {stdio: 'inherit'});
  console.log('تم:', path.relative(ROOT, OUT), (dur(OUT)).toFixed(1), 'ث');
} finally {
  await browser.close(); server.close(); await rm(tmp, {recursive: true, force: true});
}
