/* يصنع فيديوهَي «دليل الاستخدام»: video/guide-trainee.mp4 (المتدرب) وvideo/guide-trainer.mp4 (المدرب).
   تسجيل حي للتطبيق نفسه بمؤشر يتحرك ويضغط، مع كتابة مشكولة على الشاشة وتعليق صوتي بصوت حامد (ar-SA-HamedNeural):
   اللوحة الكهربائية، وورشة النيوماتيك، وشنطة الأعطال، وخط الإنتاج، ثم أدوات المدرب ونتائج المتدربين.
   المتطلبات: Node، وplaywright مع Chromium، وffmpeg، وedge-tts (pip install edge-tts).
   الاستخدام:  SSL_CERT_FILE=… NODE_PATH=… node tools/make-guide-video.mjs
   متغيرات اختيارية: GUIDE=trainee أو trainer (الافتراضي الاثنان، المتدرب أولًا لأن ما يرسله يظهر عند المدرب)،
   DRY=1 (بلا صوت، مدة ثابتة لكل مشهد، للتجربة)، SHOTS=مجلد (صورة في آخر كل مشهد)
   خادم Google مُحاكى داخل الأداة، فالنتائج في الفيديو أمثلة لا بيانات حقيقية. */
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
import {execFileSync, execFile} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {chromium} = createRequire(import.meta.url)('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
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
const tts = (text, file) => new Promise((ok, no) => execFile('edge-tts', ['--voice', VOICE, '--rate=-4%', '--text', text, '--write-media', file,
  ...(process.env.HTTPS_PROXY ? ['--proxy', process.env.HTTPS_PROXY] : [])], {timeout: 90000}, e => e ? no(e) : ok()));

/* ================= the narration, with full diacritics: shown on screen and read by the voice ================= */
const TRAINEE = [
 {run: 'intro', title: 'دَلِيلُ الْمُتَدَرِّبِ', t: 'أَهْلًا بِكَ. هَذَا دَلِيلُ الْمُتَدَرِّبِ لِاسْتِخْدَامِ مُحَاكِي وَرْشَةِ التَّحَكُّمِ فِي الْمُحَرِّكَاتِ الْكَهْرَبَائِيَّةِ: اللَّوْحَةُ الْكَهْرَبَائِيَّةُ، وَوَرْشَةُ النِّيُومَاتِيكِ، وَشَنْطَةُ اكْتِشَافِ الْأَعْطَالِ، وَخَطُّ الْإِنْتَاجِ.'},
 {run: 'name', t: 'ابْدَأْ بِكِتَابَةِ اسْمِكَ وَرَقْمِكَ التَّدْرِيبِيِّ فِي أَعْلَى الشَّاشَةِ. يُحْفَظَانِ عَلَى جِهَازِكَ.'},
 {run: 'pick', t: 'ثُمَّ اخْتَرِ التَّمْرِينَ مِنْ هَذِهِ الْقَائِمَةِ، وَالْقِطَعُ تَخْتَارُهَا أَنْتَ وَتُرَكِّبُهَا عَلَى اللَّوْحَةِ مِنْ زِرِّ «الْمُكَوِّنَاتِ» فِي الْأَسْفَلِ. وَبَعْدَ الِانْتِهَاءِ مِنَ التَّوْصِيلِ اضْغَطْ «تَقْيِيمٌ وَإِرْسَالٌ» فَيُقَيَّمُ التَّمْرِينُ آلِيًّا.'},
 {run: 'clip', t: 'زِرُّ «مَقْطَعِ التَّوْصِيلِ» يَعْرِضُ تَوْصِيلَ التَّمْرِينِ سِلْكًا سِلْكًا عَلَى اللَّوْحَةِ نَفْسِهَا بِالصَّوْتِ، وَعِنْدَ إِغْلَاقِهِ تَعُودُ لَوْحَتُكَ كَمَا كَانَتْ لِتَبْدَأَ التَّنْفِيذَ.'},
 {run: 'wire', t: 'لِتَمْدِيدِ سِلْكٍ اضْغَطْ عَلَى طَرَفٍ، ثُمَّ عَلَى الطَّرَفِ الْآخَرِ. وَزِرُّ «تَرَاجُعٍ» فِي الْأَسْفَلِ يُلْغِي آخِرَ خُطْوَةٍ.'},
 {run: 'dock', t: 'فِي الشَّرِيطِ السُّفْلِيِّ: «الْمُخَطَّطُ» يَعْرِضُ دَائِرَتَيِ الْقُوَى وَالتَّحَكُّمِ لِلتَّمْرِينِ، وَ«الْأَسْلَاكُ» لِاخْتِيَارِ لَوْنِ السِّلْكِ، وَ«الْمُكَوِّنَاتُ» لِإِضَافَةِ الْقِطَعِ، وَ«الْمِلْتِيمِتَرُ» لِلْقِيَاسِ، ثُمَّ «الْحَذْفُ».'},
 {run: 'run', t: 'بَعْدَ إِكْمَالِ التَّوْصِيلِ جَرِّبْ لَوْحَتَكَ: اضْغَطْ ضَاغِطَ التَّشْغِيلِ فَيَدُورُ الْمُحَرِّكُ وَتُضِيءُ اللَّمْبَةُ، وَاضْغَطْ ضَاغِطَ الْإِيقَافِ فَيَتَوَقَّفُ.'},
 {run: 'side', t: 'وَعَلَى جَانِبِ اللَّوْحَةِ زِرُّ «X-Ray» لِرُؤْيَةِ الْأَجْزَاءِ الدَّاخِلِيَّةِ لِلْقِطَعِ، وَزِرُّ «الْمَقْطَعِ الْعَرْضِيِّ» لِشَرْحِ أَيِّ قِطْعَةٍ مِنَ الدَّاخِلِ.', v: 'وَعَلَى جَانِبِ اللَّوْحَةِ زِرُّ إِكْس رَاي لِرُؤْيَةِ الْأَجْزَاءِ الدَّاخِلِيَّةِ لِلْقِطَعِ، وَزِرُّ الْمَقْطَعِ الْعَرْضِيِّ لِشَرْحِ أَيِّ قِطْعَةٍ مِنَ الدَّاخِلِ.'},
 {run: 'grade', t: 'عِنْدَ الِانْتِهَاءِ اضْغَطْ «تَقْيِيمٌ وَإِرْسَالٌ». يُقَيِّمُ التَّطْبِيقُ تَوْصِيلَكَ مِنْ عِشْرِينَ، وَيُشَغِّلُ لَوْحَتَكَ آلِيًّا، وَيُرِيكَ أَخْطَاءَكَ إِنْ وُجِدَتْ، وَتَسْتَطِيعُ التَّصْحِيحَ وَإِعَادَةَ التَّقْيِيمِ.'},
 {run: 'send', t: 'بَعْدَ حَلِّ الِاخْتِبَارِ النَّظَرِيِّ اضْغَطِ الْإِرْسَالَ، وَاخْتَرْ مُدَرِّبَكَ فِي أَوَّلِ مَرَّةٍ، فَتَصِلُ تَجْرِبَتُكَ إِلَيْهِ مَعَ دَرَجَتِكَ وَصُورَةِ لَوْحَتِكَ.'},
 {run: 'work', t: 'وَزِرُّ «تَمَارِينِي» يَحْفَظُ نُسْخَتَكَ مِنْ كُلِّ تَمْرِينٍ وَصَّلْتَهُ، فَتَفْتَحُهَا وَتُكْمِلُ عَلَيْهَا مَتَى شِئْتَ.'},
 {run: 'help', t: 'وَزِرُّ «الشَّرْحِ» فِي الْأَعْلَى يَشْرَحُ كُلَّ دَائِرَةٍ وَفِكْرَتَهَا وَطَرِيقَةَ عَمَلِهَا، وَزِرُّ «التَّعْرِيفِ» يَعْرِضُ فِيدْيُو تَعْرِيفِيًّا بِالْمُحَاكِي.'},
 {run: 'pn1', title: 'وَرْشَةُ النِّيُومَاتِيكِ', t: 'وَرْشَةُ النِّيُومَاتِيكِ تُفْتَحُ مِنْ أَيْقُونَتِهَا فِي الْأَعْلَى. فِيهَا اسْمُكَ وَرَقْمُكَ وَقَائِمَةُ التَّمَارِينِ وَمَقْطَعُ الشَّرْحِ، كَمَا فِي اللَّوْحَةِ الْكَهْرَبَائِيَّةِ.'},
 {run: 'pn2', t: 'عَلَى اللَّوْحَةِ وَحْدَةُ خِدْمَةِ الْهَوَاءِ وَالْمُوَزِّعُ. أَضِفِ الْأُسْطُوَانَاتِ وَالصِّمَامَاتِ مِنْ زِرِّ «الْمُكَوِّنَاتِ»، وَاسْحَبْ أَيَّ عُنْصُرٍ مِنْ إِطَارِهِ لِتَغْيِيرِ مَكَانِهِ.'},
 {run: 'pn3', t: 'لِتَرْكِيبِ خُرْطُومٍ اضْغَطْ مَنْفَذًا ثُمَّ مَنْفَذًا آخَرَ. الْمَدَاخِلُ بِالْأَحْمَرِ، وَالْمَخَارِجُ بِالْأَخْضَرِ، وَالْعَادِمُ بِالرَّمَادِيِّ، وَتُرَتَّبُ الْخَرَاطِيمُ تِلْقَائِيًّا.'},
 {run: 'pn4', t: 'بَعْدَ التَّرْكِيبِ اضْغَطْ زِرَّ الصِّمَامِ مَعَ الِاسْتِمْرَارِ، فَيَتَحَرَّكُ الْمِكْبَسُ، وَتَرَى الْهَوَاءَ دَاخِلَ الْأُسْطُوَانَةِ وَالْخَرَاطِيمِ، وَيَخْرُجُ مِنْ صِمَامِ التَّفْرِيغِ.'},
 {run: 'pn5', t: 'وَفِي الشَّرِيطِ السُّفْلِيِّ: «الْهَوَاءُ» لِفَتْحِهِ وَإِغْلَاقِهِ، وَالْحَذْفُ، وَالتَّرَاجُعُ، وَالصَّوْتُ. ثُمَّ «تَقْيِيمٌ وَإِرْسَالٌ» كَمَا فِي اللَّوْحَةِ، وَزِرُّ «رُجُوعٍ» يُعِيدُكَ إِلَى الْمُحَاكِي.'},
 {run: 'ft1', title: 'شَنْطَةُ اكْتِشَافِ الْأَعْطَالِ', t: 'شَنْطَةُ اكْتِشَافِ الْأَعْطَالِ: أَدِرْ مِقْبَضَ رَقْمِ الدَّائِرَةِ لِتَخْتَارَ الدَّائِرَةَ، فَيَظْهَرُ مُخَطَّطُهَا وَمُحَرِّكُهَا، وَتَعْمَلُ ضَوَاغِطُ الشَّنْطَةِ وَلَمَبَاتُهَا.'},
 {run: 'ft2', t: 'شَغِّلِ الْمِفْتَاحَ الرَّئِيسِيَّ وَمِفْتَاحَ التَّحَكُّمِ، ثُمَّ اضْغَطْ ضَاغِطَ التَّشْغِيلِ، وَرَاقِبْ عَمَلَ الْمُحَرِّكِ وَاللَّمَبَاتِ.'},
 {run: 'ft3', t: 'اضْغَطْ «عُطْلٌ عَشْوَائِيٌّ» فَيَضَعُ الْمُحَاكِي عُطْلًا مَخْفِيًّا، أَوْ يُرْسِلُ لَكَ الْمُدَرِّبُ عُطْلًا، ثُمَّ ابْحَثْ عَنْهُ بِالْمِلْتِيمِتَرِ: ضَعْ مِقْبَسَيْهِ عَلَى أَطْرَافِ الْمُخَطَّطِ، وَاقْرَأِ الْقِيَاسَ.'},
 {run: 'ft4', t: 'عِنْدَمَا تَعْرِفُ الْعُطْلَ اضْغَطْ «تَحْدِيدُ الْعُطْلِ»، ثُمَّ الْمُسِ السِّلْكَ أَوِ الْعُنْصُرَ الْمُعَطَّلَ. وَفِي النِّهَايَةِ «تَقْيِيمٌ وَإِرْسَالٌ»، ثُمَّ «رُجُوعٌ».'},
 {run: 'ln1', title: 'خَطُّ الْإِنْتَاجِ', t: 'خَطُّ الْإِنْتَاجِ إِثْرَاءٌ اخْتِيَارِيٌّ لِلْمُتَدَرِّبِ الْمُتَمَيِّزِ لِبَرْمَجَةِ أَجْهِزَةِ سِيمِنْز. اخْتَرِ التَّمْرِينَ وَنَوْعَ الْجِهَازِ، ثُمَّ اضْغَطْ ضَاغِطَ التَّشْغِيلِ وَشَاهِدِ الْخَطَّ يَعْمَلُ.'},
 {run: 'ln2', t: 'فِي «التَّوْصِيلِ» تُوَصِّلُ لَوْحَةَ التَّحَكُّمِ وَالْحَسَّاسَاتِ، وَزِرُّ «فَحْصٍ» يُرِيكَ الْأَخْطَاءَ. وَفِي «الْبَرْنَامَجِ» تَخْتَارُ الْمُخَطَّطَ السُّلَّمِيَّ أَوِ الْكُتَلَ أَوْ قَائِمَةَ التَّعْلِيمَاتِ، ثُمَّ تُحَمِّلُ الْبَرْنَامَجَ إِلَى الْجِهَازِ.'},
 {run: 'ln3', t: 'وَ«غُرْفَةُ التَّحَكُّمِ» شَاشَةُ سْكَادَا لِمُرَاقَبَةِ الْخَطِّ وَالْإِنْذَارَاتِ، وَفِي «الْمُخَطَّطَاتِ» وَ«الشَّرْحِ» دَوَائِرُ كُلِّ تَمْرِينٍ وَفِكْرَتُهُ. وَزِرُّ «رُجُوعٍ» يُعِيدُكَ إِلَى الْمُحَاكِي.'},
 {run: 'menu', t: 'وَقَائِمَةُ النِّقَاطِ الثَّلَاثِ فِيهَا: دَلِيلُ الِاسْتِخْدَامِ، وَتَقْيِيمُ اسْتِفَادَتِكَ مِنَ التَّطْبِيقِ، وَبَارْكُودُ الدُّخُولِ لِمُشَارَكَةِ التَّطْبِيقِ مَعَ زُمَلَائِكَ.'},
 {run: 'end', t: 'بِهَذَا تَعَرَّفْتَ عَلَى طَرِيقَةِ اسْتِخْدَامِ الْمُحَاكِي. نَتَمَنَّى لَكَ تَدْرِيبًا مُمْتِعًا وَمُفِيدًا.'}];

const TRAINER = [
 {run: 'rintro', title: 'دَلِيلُ الْمُدَرِّبِ', t: 'دَلِيلُ الْمُدَرِّبِ لِاسْتِخْدَامِ مُحَاكِي وَرْشَةِ التَّحَكُّمِ فِي الْمُحَرِّكَاتِ الْكَهْرَبَائِيَّةِ: التَّسْجِيلُ وَالدُّخُولُ، وَأَدَوَاتُ الْمُدَرِّبِ فِي الْمُحَاكِي وَالنِّيُومَاتِيكِ وَشَنْطَةِ اكْتِشَافِ الْأَعْطَالِ، وَمُتَابَعَةُ نَتَائِجِ الْمُتَدَرِّبِينَ وَدَرَجَاتِهِمْ.'},
 {run: 'reg', t: 'الْمُدَرِّبُ الْجَدِيدُ يَفْتَحُ «وَضْعَ الْمُدَرِّبِ» مِنَ الْقَائِمَةِ، وَيَضْغَطُ «تَسْجِيلَ مُدَرِّبٍ جَدِيدٍ»: يَكْتُبُ اسْمَهُ، وَاسْمَ الْمُسْتَخْدِمِ، وَبَرِيدَهُ فِي جِيمِيلَ، وَرَقْمًا سِرِّيًّا، ثُمَّ يَنْتَظِرُ مُوَافَقَةَ مُدِيرِ النِّظَامِ.'},
 {run: 'login', t: 'بَعْدَ الْمُوَافَقَةِ يَدْخُلُ بِاسْمِ الْمُسْتَخْدِمِ وَالرَّقْمِ السِّرِّيِّ. وَتُنْشَأُ لَهُ فِي جُوجِلْ دْرَايْفْ نُسْخَةٌ مِنْ نَتَائِجِ مُتَدَرِّبِيهِ وَصُوَرِ لَوْحَاتِهِمْ.'},
 {run: 'mgr', t: 'وَإِذَا كَانَ الْحِسَابُ مُدِيرًا ظَهَرَتْ لَهُ قَائِمَةُ «الْمُدَرِّبُونَ»: يَقْبَلُ الْمُدَرِّبِينَ الْجُدُدَ أَوْ يَرْفُضُهُمْ، وَيَجْعَلُ أَيَّ مُدَرِّبٍ مُدِيرًا.'},
 {run: 'tools', t: 'فِي وَضْعِ الْمُدَرِّبِ تَظْهَرُ قَائِمَةُ التَّمَارِينِ الْجَاهِزَةِ، تُحَمِّلُ تَوْصِيلَ أَيِّ تَمْرِينٍ كَامِلًا وَتُشَغِّلُهُ لِلشَّرْحِ أَمَامَ الْمُتَدَرِّبِينَ.'},
 {run: 'qr', t: 'وَ«بَارْكُودُ دُخُولِ الْمُتَدَرِّبِينَ» يَحْمِلُ حِسَابَكَ: مَنْ يَفْتَحُ التَّطْبِيقَ بِهِ يُرْبَطُ بِكَ مُبَاشَرَةً، فَتَصِلُكَ نَتَائِجُهُ دُونَ أَنْ يَخْتَارَكَ.'},
 {run: 'results', t: 'وَفِي «نَتَائِجِ الْمُتَدَرِّبِينَ» تَرَى تَجَارِبَ مُتَدَرِّبِيكَ فَقَطْ، مَجْمُوعَةً بِأَرْقَامِهِمْ، وَأَعْلَى مُحَاوَلَةٍ لِكُلِّ تَمْرِينٍ إِنْ سَمَحْتَ بِتَكْرَارِ الْإِرْسَالِ. وَزِرُّ «رُصِدَ» تَضْغَطُهُ بَعْدَ رَصْدِ الدَّرَجَةِ فِي كَشْفِكَ.'},
 {run: 'res2', t: 'وَفِي الْأَعْلَى: الْبَحْثُ بِالِاسْمِ أَوِ الرَّقْمِ، وَعَرْضُ مَا لَمْ يُرْصَدْ فَقَطْ، وَتَنْزِيلُ النَّتَائِجِ مِلَفًّا يُفْتَحُ فِي إِكْسِلْ، وَحَذْفُ الْمُحَاوَلَاتِ الْأَقَلِّ.'},
 {run: 'guess', t: 'وَإِذَا أَرْسَلَ الْمُتَدَرِّبُ تَوْصِيلَهُ عَلَى تَمْرِينٍ خَاطِئٍ، فَزِرُّ «أَيُّ تَمْرِينٍ؟» يَكْتَشِفُ أَقْرَبَ تَمْرِينٍ لِتَوْصِيلِهِ، وَتَنْقُلُهُ إِلَيْهِ فَيُعَادُ تَقْيِيمُهُ.'},
 {run: 'open', t: 'وَتَفْتَحُ تَوْصِيلَ أَيِّ مُتَدَرِّبٍ عَلَى اللَّوْحَةِ لِتَطَّلِعَ عَلَيْهِ وَتُشَغِّلَهُ، وَتُعَدِّلُ دَرَجَتَهُ يَدَوِيًّا مَعَ ذِكْرِ السَّبَبِ إِذَا احْتَجْتَ إِلَى ذَلِكَ.'},
 {run: 'lock', t: 'وَمِنَ الْقَائِمَةِ تُفَعِّلُ «قَفْلَ التَّمْرِينِ بَعْدَ إِرْسَالِهِ» أَوْ تُلْغِيهِ: إِذَا فَعَّلْتَهُ لَا يُعَدِّلُ الْمُتَدَرِّبُ تَمْرِينًا أَرْسَلَهُ وَلَا يُعِيدُ إِرْسَالَهُ حَتَّى تُوقِفَهُ.'},
 {run: 'rpn', title: 'الْمُدَرِّبُ فِي النِّيُومَاتِيكِ', t: 'وَعِنْدَمَا تَفْتَحُ وَرْشَةَ النِّيُومَاتِيكِ وَأَنْتَ مُدَرِّبٌ، تُفْتَحُ بِوَضْعِ الْمُدَرِّبِ: فِيهَا الدَّوَائِرُ الْجَاهِزَةُ لِكُلِّ تَمْرِينٍ، وَنَتَائِجُ مُتَدَرِّبِيكَ فِي النِّيُومَاتِيكِ.'},
 {run: 'rft', title: 'الْمُدَرِّبُ فِي الشَّنْطَةِ', t: 'وَفِي شَنْطَةِ اكْتِشَافِ الْأَعْطَالِ تَظْهَرُ مَفَاتِيحُ الْأَعْطَالِ مِنْ ثَمَانِيَةٍ إِلَى ثَلَاثِينَ: الْمَفَاتِيحُ الرَّمَادِيَّةُ لَا عَلَاقَةَ لَهَا بِالدَّائِرَةِ، وَبِالضَّغْطِ عَلَى مِفْتَاحٍ تَرَى عُطْلَهُ وَعَرَضَهُ وَتُفَعِّلُهُ.'},
 {run: 'rft2', t: 'ثُمَّ «إِرْسَالُ التَّمْرِينِ لِلْمُتَدَرِّبِينَ» يُعْطِيكَ رَابِطًا أَوْ بَارْكُودًا يَفْتَحُ الدَّائِرَةَ عِنْدَهُمْ بِهَذِهِ الْأَعْطَالِ مَخْفِيَّةً، فَيَبْحَثُونَ عَنْهَا وَيُرْسِلُونَ النَّتِيجَةَ.'},
 {run: 'exit', t: 'وَلِلْخُرُوجِ اضْغَطِ «الْخُرُوجَ مِنْ وَضْعِ الْمُدَرِّبِ» فِي الْقَائِمَةِ، فَتَعُودُ اللَّوْحَةُ لِلْمُتَدَرِّبِينَ كَمَا كَانَتْ.'},
 {run: 'rend', t: 'بِهَذَا تَعَرَّفْتَ عَلَى أَدَوَاتِ الْمُدَرِّبِ. نَتَمَنَّى لَكَ وَلِمُتَدَرِّبِيكَ تَدْرِيبًا مُثْمِرًا.'}];

/* ================= a stand-in for the Google results server: what the trainee sends reaches the trainer ================= */
const SUBS = [{uid: 'a1b2c3d4', t: Date.now() - 3600e3, n: 'خالد سعيد', id: '1042', ex: 'p2', s: 18, code: '', th: '', tr: 'ahmed', rasd: true, man: '', mn: ''}];
const TRS = [{u: 'sara', n: 'م. سارة خالد', st: 'pending', t: Date.now() - 7200e3, c: 0, e: 'sara@gmail.com', url: '', role: ''},
  {u: 'ahmed', n: 'م. أحمد علي', st: 'ok', t: Date.now() - 864e5 * 30, c: 2, e: 'ahmed@gmail.com', url: '', role: 'admin'}];
let LOCK = false;
function gas(d) {
  const a = d.action;
  if (a === 'submit') { const uid = Math.random().toString(16).slice(2, 10); SUBS.push({uid, t: Date.now(), n: d.n, id: d.id, ex: d.ex, s: d.s, code: d.code || '', th: d.th || '', tr: d.tr || '', rasd: false, man: '', mn: ''}); return {ok: true, uid}; }
  if (a === 'trNames') return {ok: true, list: [{u: 'ahmed', n: 'م. أحمد علي'}]};
  if (a === 'trReg') return {ok: true, st: 'pending'};
  if (a === 'trLogin') return d.u === 'ahmed' && d.pin === '2468' ? {ok: true, u: 'ahmed', n: 'م. أحمد علي', admin: true, url: '', furl: ''} : {ok: false, err: 'pin', msg: 'اسم المستخدم أو الرقم السري غير صحيح'};
  if (a === 'who') return {ok: true, admin: true, tr: 'ahmed', n: 'م. أحمد علي', lk: LOCK};
  if (a === 'list') return {ok: true, admin: true, n: SUBS.length, rows: SUBS};
  if (a === 'trList') return {ok: true, list: TRS};
  if (a === 'trSet') { const t = TRS.find(x => x.u === d.u); if (t && (d.st === 'ok' || d.st === 'no')) t.st = d.st; return {ok: true}; }
  if (a === 'lkGet') return {ok: true, lk: false, ex: []};
  if (a === 'lkSet') { LOCK = !!d.on; return {ok: true, lk: LOCK}; }
  if (a === 'rates') return {ok: true, rows: []};
  if (a === 'pinCheck') return {ok: false, err: 'pin'};
  if (a === 'img') return {ok: false, err: 'notfound'};
  return {ok: true};
}

/* ================= the pointer, its tap, the caption and a section title, drawn over the app ================= */
const OVERLAY = () => { if (window !== top) return; addEventListener('DOMContentLoaded', () => {
  const st = document.createElement('style');
  st.textContent = `#gPtr{position:fixed;left:-60px;top:-60px;width:34px;height:34px;z-index:2147483647;pointer-events:none;transition:left .7s cubic-bezier(.4,.1,.2,1),top .7s cubic-bezier(.4,.1,.2,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
  #gPtr svg{width:34px;height:34px;transform:translate(-6px,-3px)}#gRip{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #ffb300;z-index:2147483646;pointer-events:none;opacity:0}
  #gRip.on{animation:gr .6s ease-out}@keyframes gr{0%{opacity:1;transform:scale(.6)}100%{opacity:0;transform:scale(3.4)}}
  #gCap{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);max-width:88%;z-index:2147483645;pointer-events:none;direction:rtl;text-align:center;background:rgba(8,22,44,.9);color:#fff;font:600 23px/1.95 'Noto Naskh Arabic','Amiri','Noto Sans Arabic',Tahoma,sans-serif;padding:8px 22px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.18);box-shadow:0 6px 24px rgba(0,0,0,.35);transition:opacity .3s}
  #gCap:empty{opacity:0}#gHi{position:fixed;z-index:2147483644;pointer-events:none;border:3px solid #ffb300;border-radius:12px;box-shadow:0 0 0 4px rgba(255,179,0,.25);opacity:0;transition:all .45s}
  #gTtl{position:fixed;left:50%;top:42%;transform:translate(-50%,-50%) scale(.9);z-index:2147483645;pointer-events:none;direction:rtl;background:linear-gradient(135deg,#0b3d91,#0a6b8f);color:#fff;font:700 40px/1.9 'Noto Naskh Arabic','Amiri',Tahoma,sans-serif;padding:14px 46px;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.45);opacity:0;transition:opacity .5s,transform .5s}
  #gTtl.on{opacity:1;transform:translate(-50%,-50%) scale(1)}`;
  document.head.appendChild(st);
  const p = document.createElement('div'); p.id = 'gPtr'; p.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 2l14 11-6.2 1 3.6 7-2.6 1.3-3.6-7L5 20z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const r = document.createElement('div'); r.id = 'gRip'; const c = document.createElement('div'); c.id = 'gCap'; const h = document.createElement('div'); h.id = 'gHi'; const tt = document.createElement('div'); tt.id = 'gTtl';
  document.body.append(h, tt, c, r, p);
  window.__g = {
    move: (x, y) => { p.style.left = x + 'px'; p.style.top = y + 'px'; },
    tap: () => { r.style.left = p.style.left; r.style.top = p.style.top; r.classList.remove('on'); void r.offsetWidth; r.classList.add('on'); },
    cap: t => { c.textContent = t; },
    title: t => { tt.textContent = t || ''; tt.classList.toggle('on', !!t); },
    hi: b => { if (!b) { h.style.opacity = 0; return; } Object.assign(h.style, {left: b.x - 5 + 'px', top: b.y - 5 + 'px', width: b.width + 10 + 'px', height: b.height + 10 + 'px', opacity: 1}); }};
}); };

async function record(SC, OUT, tmp, tag) {
  /* 1. the voice of every scene */
  for (let i = 0; i < SC.length; i++) {
    if (DRY) { SC[i].len = 5; continue; }
    const f = path.join(tmp, `${tag}${i}.mp3`);
    for (let k = 0; ; k++) { try { await tts(SC[i].v || SC[i].t, f); break; } catch (e) { if (k > 3) throw e; await sleep(2000 * (k + 1)); } }
    SC[i].mp3 = f; SC[i].len = dur(f); console.log(`${tag} صوت ${i + 1}/${SC.length}: ${SC[i].len.toFixed(1)} ث`);
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
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? '' : undefined));
  await page.goto(BASE + 'index.html', {waitUntil: 'load'});
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.fonts.ready);
  const closeModals = () => page.evaluate(() => document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')));
  await closeModals();

  /* helpers: move the pointer to an element (also inside the workshops' frames), highlight it, click or hold it like a person */
  const box = async t => { const l = typeof t === 'string' ? page.locator(t).first() : t; try { await l.scrollIntoViewIfNeeded({timeout: 1500}); } catch {} return l.boundingBox({timeout: 1500}).catch(() => null); };
  const pt = async (t, {click = true, dwell = 450, hi = true, hold = 0} = {}) => {
    const b = await box(t); if (!b) { console.log('لم يُعثر على', String(t)); return false; }
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.evaluate(([x, y, b, hi]) => { __g.move(x, y); __g.hi(hi ? b : null); }, [x, y, b, hi]); await page.waitForTimeout(800);
    if (hold) { await page.evaluate(() => __g.tap()); await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(hold); await page.mouse.up(); }
    else if (click) { await page.evaluate(() => __g.tap()); await page.mouse.click(x, y); }
    await page.waitForTimeout(dwell); await page.evaluate(() => __g.hi(null)); return true; };
  const typeIn = async (sel, text, f = page) => { await pt(f === page ? sel : f.locator(sel).first()); const fr = f === page ? page : await frameOf(f);
    for (const ch of text) { await fr.evaluate(([s, ch]) => { const e = document.querySelector(s); e.value += ch; e.dispatchEvent(new Event('input', {bubbles: true})); }, [sel, ch]); await page.waitForTimeout(110); }
    await fr.evaluate(s => document.querySelector(s).dispatchEvent(new Event('change', {bubbles: true})), sel); };
  const setSel = (sel, v, fr = page) => fr.evaluate(([s, v]) => { const e = document.querySelector(s); if (![...e.options].some(o => o.value === v)) { const o = document.createElement('option'); o.value = v; e.appendChild(o); } e.value = v; e.dispatchEvent(new Event('change', {bubbles: true})); }, [sel, v]);
  const more = async open => { await page.evaluate(o => { const d = document.querySelector('.more'); if (d) d.open = o; }, open); await page.waitForTimeout(350); };
  const wait = ms => page.waitForTimeout(ms);
  /* the workshops open in frames over the simulator */
  const OV = {pn: '#pnOverlay iframe', ft: '#ftOverlay iframe', ln: '#lnOverlay iframe'};
  const FL = {pn: page.frameLocator(OV.pn), ft: page.frameLocator(OV.ft), ln: page.frameLocator(OV.ln)};
  const frameOf = async fl => { for (const k in FL) if (FL[k] === fl) { const h = await page.$(OV[k]); return h && h.contentFrame(); } return page; };
  const frm = async k => { for (let i = 0; i < 30; i++) { const h = await page.$(OV[k]); const f = h && await h.contentFrame(); if (f && await f.evaluate(() => document.readyState === 'complete').catch(() => false)) return f; await wait(200); } return null; };
  const inF = (k, sel) => FL[k].locator(sel).first();
  const fClose = async k => { const f = await frm(k); if (f) await f.evaluate(() => document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'))).catch(() => {}); };
  const back = async k => { if (!(await pt(inF(k, k === 'ln' ? '#bBack' : 'a:has-text("رجوع"), button:has-text("رجوع")'), {dwell: 700}))) await page.evaluate(k => { const c = {pn: '__pnClose', ft: '__ftClose', ln: '__lnClose'}[k]; window[c] && window[c](); }, k); };

  const ACT = {
    /* ---------- trainee ---------- */
    intro: async () => { await page.evaluate(() => __g.move(640, 380)); await wait(1500); await pt('h1', {click: false, dwell: 1200}); },
    name: async () => { await typeIn('#stName', 'سعد محمد'); await typeIn('#stId', '2051'); },
    pick: async () => { await pt('#exPick', {click: false, dwell: 600}); await setSel('#exPick', 'p1'); await wait(900); await closeModals(); await wait(2500); await pt('#dParts', {click: false, dwell: 1500}); },
    clip: async () => { await pt('#exClip'); await wait(9000); await pt('#wcX'); await closeModals(); },
    wire: async () => { await pt('[data-term="F1.2"]', {dwell: 300}); await pt('[data-term="XP.I1"]', {dwell: 1400}); await pt('#dUndo', {dwell: 900}); },
    dock: async () => { await pt('#dSd', {dwell: 2500}); await pt('#dSd', {dwell: 300});
      await pt('#dCol', {dwell: 1100}); await page.mouse.click(5, 300); await wait(200); await pt('#dParts', {dwell: 1300}); await page.evaluate(() => { const x = document.getElementById('pPopX'); if (x) x.click(); });
      await pt('#dMM', {click: false, dwell: 700}); await pt('#dDelM', {click: false, dwell: 700}); },
    run: async () => { await setSel('#dPreset', 'p1'); await wait(500); await closeModals();
      await pt('[data-press="S1"]', {dwell: 600}); await pt('[data-act="snd:M1"]', {click: false, dwell: 2600}); await pt('[data-press="S0"]', {dwell: 900}); },
    side: async () => { await pt('#xrTab', {dwell: 2500}); await pt('#xrTab', {dwell: 400}); await pt('#xsTab', {click: false, dwell: 800}); },
    grade: async () => { await pt('#bGrade', {dwell: 2500}); await page.evaluate(() => document.getElementById('gBody').scrollBy({top: 260, behavior: 'smooth'})); await wait(1500); },
    send: async () => { await page.evaluate(() => { const seen = new Set(); document.querySelectorAll('#gBody [data-qz]').forEach(r => { const k = r.dataset.qz; if (seen.has(k)) return; seen.add(k); r.checked = true; r.dispatchEvent(new Event('change', {bubbles: true})); }); });
      if (await page.locator('#qzGo').count()) await pt('#qzGo', {dwell: 700}); await pt('#gSend', {dwell: 700}); await pt('#sCloud', {dwell: 900});
      if (await page.locator('#trPickM.open').count()) { await pt('#trPickS', {click: false, dwell: 300}); await page.evaluate(() => { const s = document.getElementById('trPickS'); s.value = s.options[s.options.length > 1 ? 1 : 0].value; s.dispatchEvent(new Event('change', {bubbles: true})); }); await pt('#trPickOk', {dwell: 300}); }
      await wait(3500); await closeModals(); },
    work: async () => { await pt('#bWork', {dwell: 2600}); await pt('#wkClose', {dwell: 300}); },
    help: async () => { await pt('#bHelp', {dwell: 3200}); await closeModals(); await pt('#bVid', {click: false, dwell: 800}); },
    pn1: async () => { await pt('#bPneu', {dwell: 1500}); const f = await frm('pn'); await fClose('pn');
      await pt(inF('pn', '#stName'), {click: false, dwell: 400}); await pt(inF('pn', '#exPick'), {click: false, dwell: 400}); await setSel('#exPick', '0', f); await wait(700); await fClose('pn'); await pt(inF('pn', '#exClip'), {click: false, dwell: 700}); },
    pn2: async () => { const f = await frm('pn'); await pt(inF('pn', '[data-port="0Z.P1"]'), {click: false, dwell: 900}); await pt(inF('pn', '#dParts'), {dwell: 1200});
      await pt(inF('pn', '[data-add="cyl2"]'), {dwell: 1200}); await f.evaluate(() => { const x = document.getElementById('pPopX'); if (x) x.click(); document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})); }); await wait(300); if (await f.evaluate(() => { const p = document.getElementById('pPop'); return !!p && p.offsetParent !== null; })) await pt(inF('pn', '#dParts'), {dwell: 400}); },
    pn3: async () => { const f = await frm('pn'); const k = await f.evaluate(() => { const L = [...document.querySelectorAll('[data-port]')].map(e => e.dataset.port); return L.find(x => !/^0Z|^SU|^AS/.test(x)) || ''; });
      await pt(inF('pn', '[data-port="0Z.P2"]'), {dwell: 300}); if (k) await pt(inF('pn', `[data-port="${k}"]`), {dwell: 1500}); },
    pn4: async () => { const f = await frm('pn'); await setSel('#dPreset', await f.evaluate(() => document.getElementById('exPick').value || '0'), f); await wait(900); await fClose('pn'); await pt(inF('pn', '#dFit'), {dwell: 800});
      await pt(inF('pn', '[data-press]'), {hold: 3200, dwell: 1500}); },
    pn5: async () => { for (const s of ['#dAir', '#dDel', '#dUndo', '#dSnd']) await pt(inF('pn', s), {click: false, dwell: 350}); await pt(inF('pn', '#bGrade'), {click: false, dwell: 600}); await back('pn'); },
    ft1: async () => { await pt('#bFault', {dwell: 1500}); await frm('ft'); await fClose('ft'); await pt(inF('ft', '[data-p="5.2"]'), {dwell: 2000}); await fClose('ft'); },
    ft2: async () => { await pt(inF('ft', '#cQ1'), {dwell: 500}); await pt(inF('ft', '#cQ2'), {dwell: 500}); await pt(inF('ft', '#kS2'), {hold: 600, dwell: 2500}); },
    ft3: async () => { await pt(inF('ft', '#dRand'), {dwell: 1200}); await fClose('ft'); await pt(inF('ft', '#dMM'), {click: false, dwell: 600}); await pt(inF('ft', '#mmBox, .mm, [id^=mm]'), {click: false, dwell: 1200}); },
    ft4: async () => { await pt(inF('ft', '#dDiag'), {dwell: 1500}); await pt(inF('ft', '#dDiag'), {dwell: 400}); await pt(inF('ft', '#bSend'), {click: false, dwell: 700}); await back('ft'); },
    ln1: async () => { await pt('#bLine2', {dwell: 2000}); const f = await frm('ln'); await pt(inF('ln', '#exSel'), {click: false, dwell: 300}); await setSel('#exSel', 'e4', f); await wait(800);
      await pt(inF('ln', '#m1200'), {click: false, dwell: 500}); await pt(inF('ln', '#ops [data-pb="S1"]'), {hold: 500, dwell: 4500}); },
    ln2: async () => { await pt(inF('ln', '.tab[data-t="wire"]'), {dwell: 1500}); await pt(inF('ln', '#wChk'), {dwell: 1500}); await pt(inF('ln', '.tab[data-t="prog"]'), {dwell: 1200});
      for (const l of ['FBD', 'STL', 'LAD']) await pt(inF('ln', `[data-lang="${l}"]`), {dwell: 1300}); },
    ln3: async () => { for (const t of ['scada', 'sch', 'ex']) await pt(inF('ln', `.tab[data-t="${t}"]`), {dwell: 1600}); await pt(inF('ln', '.tab[data-t="line"]'), {dwell: 300}); await back('ln'); },
    menu: async () => { await pt('.more summary', {click: false, dwell: 100}); await more(true); for (const id of ['#bGuide', '#bRate', '#bQR2']) await pt(id, {click: false, dwell: 500}); await more(false); },
    end: async () => { await closeModals(); await page.evaluate(() => __g.move(1240, 60)); },
    /* ---------- trainer ---------- */
    rintro: async () => { await page.evaluate(() => __g.move(640, 380)); await wait(1500); },
    reg: async () => { await pt('.more summary', {click: false, dwell: 100}); await more(true); await pt('#bTrainer', {dwell: 700}); await pt('#trRegB', {dwell: 700});
      await typeIn('#trN', 'م. سارة خالد'); await typeIn('#trU', 'sara'); await typeIn('#trE', 'sara@gmail.com'); await pt('#trRegOk', {click: false, dwell: 600}); await closeModals(); },
    login: async () => { await more(true); await pt('#bTrainer', {dwell: 600}); await typeIn('#pinU', 'ahmed'); await typeIn('#pinIn', '2468'); await pt('#pinOk', {dwell: 2000}); await closeModals(); },
    mgr: async () => { await more(true); await pt('#bTrMgr', {dwell: 2000}); await pt('[data-trs="sara:ok"]', {dwell: 1800}); await closeModals(); },
    tools: async () => { await pt('#dPreset', {click: false, dwell: 500}); await setSel('#dPreset', 'p3'); await wait(1500); await closeModals(); await pt('[data-press="S1"]', {dwell: 1500}); },
    qr: async () => { await more(true); await pt('#bQR2', {click: false, dwell: 1500}); await more(false); },
    results: async () => { await more(true); await pt('#bResults', {dwell: 2600}); await page.evaluate(() => document.querySelectorAll('details.rgrp').forEach(d => d.open = true)); await wait(1000); await pt('[data-rseen]', {dwell: 900}); },
    res2: async () => { for (const s of ['#rFind', '#rNew', '#rCsv', '#rBestAll']) await pt(s, {click: false, dwell: 500}); },
    guess: async () => { await pt('[data-rguess]', {dwell: 2500}); },
    open: async () => { await pt('[data-rman]', {click: false, dwell: 900}); await pt('[data-ropen]', {dwell: 2200}); await closeModals(); await pt('[data-stuman]', {click: false, dwell: 1500}); await page.evaluate(() => { const b = document.querySelector('[data-stux]'); if (b) b.click(); }); },
    lock: async () => { await more(true); await pt('#bLock', {dwell: 2200}); await more(true); await pt('#bLock', {dwell: 1200}); await more(false); },
    rpn: async () => { await pt('#bPneu', {dwell: 1800}); const f = await frm('pn'); await fClose('pn'); await pt(inF('pn', '#dPreset'), {click: false, dwell: 400}); await setSel('#dPreset', '2', f); await wait(1500); await fClose('pn');
      await f.evaluate(() => { const d = document.querySelector('.more'); if (d) d.open = true; }); await wait(300); await pt(inF('pn', '#bResults'), {click: false, dwell: 900}); await f.evaluate(() => { const d = document.querySelector('.more'); if (d) d.open = false; }); await back('pn'); },
    rft: async () => { await pt('#bFault', {dwell: 1600}); const f = await frm('ft'); await fClose('ft'); await pt(inF('ft', '[data-p="5.1"]'), {dwell: 1200}); await fClose('ft');
      await pt(inF('ft', '#fswBox'), {click: false, dwell: 600}); await pt(inF('ft', '[data-cf="1"]'), {dwell: 1300}); await pt(inF('ft', '#swT'), {dwell: 1300}); await pt(inF('ft', '#swX'), {dwell: 300}); },
    rft2: async () => { await pt(inF('ft', '#fswShare'), {click: false, dwell: 1500}); await back('ft'); },
    exit: async () => { await more(true); await pt('#bTrainer', {dwell: 1600}); },
    rend: async () => { await closeModals(); await page.evaluate(() => __g.move(1240, 60)); }};

  const marks = [];
  for (let i = 0; i < SC.length; i++) {
    const s = SC[i];
    await page.evaluate(([t, ti]) => { __g.cap(t); __g.title(ti || ''); }, [s.t, s.title || '']);
    if (s.title) setTimeout(() => page.evaluate(() => __g.title('')).catch(() => {}), 2600);
    const start = Date.now() - tRec; marks.push(start);
    const act = ACT[s.run]().catch(e => console.log(tag, 'مشهد', i + 1, e.message.split('\n')[0]));
    await Promise.all([act, sleep(s.len * 1000 + 700)]);
    if (SHOTS) { mkdirSync(SHOTS, {recursive: true}); await page.screenshot({path: path.join(SHOTS, `${tag}${String(i + 1).padStart(2, '0')}.png`)}); }
    console.log(`${tag} مشهد ${i + 1}/${SC.length} (${s.run}): ${((Date.now() - tRec - start) / 1000).toFixed(1)} ث`);
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
}

const tmp = await mkdtemp(path.join(tmpdir(), 'guide-'));
try {
  const G = process.env.GUIDE || 'both';
  if (G !== 'trainer') await record(TRAINEE, path.join(ROOT, 'video', 'guide-trainee.mp4'), tmp, 'T');
  if (G !== 'trainee') await record(TRAINER, path.join(ROOT, 'video', 'guide-trainer.mp4'), tmp, 'R');
} finally { server.close(); await rm(tmp, {recursive: true, force: true}); }
