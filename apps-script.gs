// ===== كود حفظ تجارب المتدربين في Google Sheets وصورها في Google Drive =====
// هذا هو كود خادم Google كاملًا (Apps Script): الحفظ والنتائج، والرقم السري للمدرب، وحفظ الدرجات بعد إعادة التقييم.
// طريقة التحديث: الصقه كله مكان الكود في مشروع Apps Script، واحفظ، ثم:
//   نشر ← إدارة عمليات النشر ← ✏️ تعديل ← الإصدار: إصدار جديد ← نشر  (لا تنشئ عملية نشر جديدة حتى يبقى الرابط نفسه)
// غيّر كلمة السر في السطر التالي قبل النشر، ولا تشاركها مع المتدربين
const KEY = '4178';

const SHEET = 'التجارب';
const FOLDER = 'صور تجارب المحاكي';
const RATES = 'تقييم الاستفادة';

// يعمل الكود سواء كان مربوطًا بجدول أو مشروعًا مستقلًا: يحفظ رقم الجدول ويعيد استخدامه
// إذا تعثّر فتح الجدول المحفوظ (انشغال مؤقت في Google) يُعاد المحاولة، ولا يُنشأ جدول جديد فارغ أبدًا مكانه،
// لأن الجدول الجديد كان يجعل النتائج تظهر صفرًا وتتوزع التجارب على أكثر من ملف
function ss_() {
  const pr = PropertiesService.getScriptProperties();
  const id = pr.getProperty('SSID');
  if (id) {
    for (let k = 0; k < 4; k++) {
      try { return SpreadsheetApp.openById(id); } catch (err) { Utilities.sleep(700 * (k + 1)); }
    }
    throw new Error('تعذّر فتح جدول النتائج الآن (انشغال مؤقت في Google). أعد المحاولة بعد قليل.');
  }
  let ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (err) {}
  if (!ss) ss = SpreadsheetApp.create('نتائج المحاكي');
  pr.setProperty('SSID', ss.getId());
  return ss;
}

function sheet_() {
  const ss = ss_();
  let s = ss.getSheetByName(SHEET);
  if (!s) {
    s = ss.insertSheet(SHEET);
    s.appendRow(['المعرف', 'الوقت', 'الاسم', 'الرقم التدريبي', 'التمرين', 'الدرجة', 'الكود', 'صورة مصغرة', 'ملف الصورة']);
    s.setFrozenRows(1);
  }
  return s;
}

// ورقة تقييم المتدربين لاستفادتهم من التطبيق (من 100)، صف واحد لكل جهاز يُحدَّث إذا عدّل المتدرب تقييمه
function rates_() {
  const ss = ss_();
  let r = ss.getSheetByName(RATES);
  if (!r) {
    r = ss.insertSheet(RATES);
    r.appendRow(['معرف الجهاز', 'الوقت', 'الاسم', 'الرقم التدريبي', 'الاستفادة من 100', 'الملاحظة']);
    r.setFrozenRows(1);
  }
  return r;
}

function folder_() {
  const it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return out_({ ok: true, msg: 'الخدمة تعمل' });
}

// شغّل هذه الدالة مرة واحدة من المحرر لمنح الأذونات (زر Run)
function setup() {
  sheet_();
  const f = folder_();
  Logger.log('جدول النتائج: ' + ss_().getUrl());
  Logger.log('مجلد الصور: ' + f.getUrl());
}

function doPost(e) {
  // طلبات الرقم السري للمدرب (التحقق والتغيير) تُعالج أولًا
  var pinR = pinRoute_(e); if (pinR) return pinR;

  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, err: 'bad' }); }
  // القراءة (عرض النتائج والصور) لا تنتظر القفل، فلا تتعطل وقت إرسال المتدربين؛ الكتابة وحدها تنتظره
  const write = ['submit', 'del', 'setScores', 'rate', 'rasd'].indexOf(d.action) >= 0;
  const lock = LockService.getScriptLock();
  if (write) { try { lock.waitLock(25000); } catch (err) { return out_({ ok: false, err: 'busy', msg: 'الخادم مشغول بإرسال آخر، أعد المحاولة' }); } }
  try {
    const s = sheet_();

    if (d.action === 'submit') {
      const n = String(d.n || '').trim().slice(0, 80);
      const id = String(d.id || '').trim().slice(0, 30);
      if (!n || !id) return out_({ ok: false, err: 'missing' });
      const uid = Utilities.getUuid().slice(0, 8);
      let fid = '';
      if (d.img && String(d.img).length < 8000000) {
        try {
          const blob = Utilities.newBlob(Utilities.base64Decode(String(d.img)), 'image/jpeg', id + '-' + uid + '.jpg');
          fid = folder_().createFile(blob).getId();
        } catch (err) { fid = ''; }
      }
      const th = String(d.th || '').length < 45000 ? String(d.th || '') : '';
      s.appendRow([uid, new Date(), n, "'" + id, String(d.ex || ''), d.s === '' ? '' : Number(d.s),
                   String(d.code || '').slice(0, 45000), th, fid]);
      return out_({ ok: true, uid: uid });
    }

    // تقييم المتدرب لاستفادته (اختياري): لا يحتاج كلمة السر
    if (d.action === 'rate') {
      const v = Math.round(Number(d.v));
      if (!(v >= 0 && v <= 100)) return out_({ ok: false, err: 'missing' });
      const r = rates_(), rid = String(d.rid || '').slice(0, 40);
      const row = [rid, new Date(), String(d.n || '').trim().slice(0, 80), "'" + String(d.id || '').trim().slice(0, 30), v, String(d.c || '').slice(0, 500)];
      const vals = r.getDataRange().getValues();
      for (let i = 1; i < vals.length; i++) {
        if (rid && String(vals[i][0]) === rid) { r.getRange(i + 1, 1, 1, 6).setValues([row]); return out_({ ok: true, upd: true }); }
      }
      r.appendRow(row);
      return out_({ ok: true });
    }

    if (String(d.key || '') !== KEY) return out_({ ok: false, err: 'key' });

    if (d.action === 'rates') {
      const v = rates_().getDataRange().getValues().slice(1).filter(r => r[4] !== '' && r[4] != null);
      return out_({ ok: true, rows: v.map(r => ({
        t: r[1] instanceof Date ? r[1].getTime() : r[1], n: String(r[2]), id: String(r[3]).replace(/^'/, ''), v: Number(r[4]), c: String(r[5] || '')
      })) });
    }

    if (d.action === 'list') {
      SpreadsheetApp.flush();
      const v = s.getDataRange().getValues().slice(1).filter(r => String(r[0]));
      return out_({ ok: true, n: v.length, rows: v.map(r => ({
        uid: String(r[0]), t: r[1] instanceof Date ? r[1].getTime() : r[1],
        n: String(r[2]), id: String(r[3]), ex: String(r[4]), s: r[5], code: String(r[6]),
        th: String(r[7] || ''), fid: String(r[8] || ''), rasd: r[10] === true || String(r[10]) === '1'
      })) });
    }

    if (d.action === 'img') {
      const fid = String(d.fid || '');
      const ok = s.getDataRange().getValues().slice(1).some(r => String(r[8]) === fid);
      if (!fid || !ok) return out_({ ok: false, err: 'notfound' });
      const b = DriveApp.getFileById(fid).getBlob();
      return out_({ ok: true, b64: Utilities.base64Encode(b.getBytes()) });
    }

    if (d.action === 'del') {
      const ids = new Set((d.uids || []).map(String));
      const v = s.getDataRange().getValues();
      for (let i = v.length - 1; i >= 1; i--) {
        if (ids.has(String(v[i][0]))) {
          if (v[i][8]) { try { DriveApp.getFileById(String(v[i][8])).setTrashed(true); } catch (err) {} }
          s.deleteRow(i + 1);
        }
      }
      return out_({ ok: true });
    }

    // علامة «رُصد» (رصد المدرب الدرجة في كشفه): العمود الحادي عشر، فتظهر نفسها على كل أجهزة المدرب
    if (d.action === 'rasd') {
      const ids = new Set((d.uids || []).map(String)), on = d.on !== false;
      const v = s.getDataRange().getValues();
      if (v.length && String(v[0][10] || '') === '') s.getRange(1, 11).setValue('رُصد');
      let n = 0;
      for (let i = 1; i < v.length; i++) {
        if (ids.has(String(v[i][0]))) { s.getRange(i + 1, 11).setValue(on ? 1 : ''); n++; }
      }
      return out_({ ok: true, n: n });
    }

    // حفظ الدرجات بعد إعادة تقييم النتائج بالقواعد الحالية من نافذة «نتائج المتدربين»: {معرف التجربة: الدرجة}
    if (d.action === 'setScores') {
      const m = d.scores || {};
      const v = s.getDataRange().getValues();
      let n = 0;
      for (let i = 1; i < v.length; i++) {
        const u = String(v[i][0]);
        if (Object.prototype.hasOwnProperty.call(m, u)) {
          const x = m[u];
          s.getRange(i + 1, 6).setValue(x === '' || x == null || isNaN(Number(x)) ? '' : Number(x));
          n++;
        }
      }
      return out_({ ok: true, n: n });
    }

    return out_({ ok: false, err: 'action' });
  } catch (err) {
    return out_({ ok: false, err: 'server', msg: String(err && err.message || err).slice(0, 300) });
  } finally {
    if (write) lock.releaseLock();
  }
}

/* ===== الرقم السري للمدرب على خادم Google =====
   يجعل تغيير الرقم السري للمدرب من الموقع يسري على كل الأجهزة.
   الرقم يُحفظ مشفّرًا (hash) في خصائص السكربت، ولا يظهر في الموقع.
   الرقم الافتراضي 4178 إلى أن تغيّره من الموقع: ⋯ ← 🔑 تغيير الرقم السري للمدرب. */

var PIN_DEFAULT_H = 'ba1ab459'; // تشفير الرقم 4178

function pinHash_(p) {
  var h = 5381, s = 'wsh:' + p;
  for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

function pinOut_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* يعيد ردًّا لطلبات الرقم السري فقط، وnull لأي طلب آخر فيكمل doPost عمله المعتاد */
function pinRoute_(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (_) { return null; }
  if (!d || ['pinGet', 'pinCheck', 'pinSet'].indexOf(d.action) < 0) return null;

  var P = PropertiesService.getScriptProperties();
  var cur = P.getProperty('PIN_H') || PIN_DEFAULT_H;
  var ver = +(P.getProperty('PIN_V') || 0);
  if (d.action === 'pinGet') return pinOut_({ ok: true, v: ver });

  // حد للمحاولات الخاطئة: 10 كل 10 دقائق
  var C = CacheService.getScriptCache(), fails = +(C.get('PIN_FAILS') || 0);
  if (fails >= 10) return pinOut_({ ok: false, err: 'busy', msg: 'محاولات خاطئة كثيرة' });
  var given = String(d.action === 'pinSet' ? d.old || '' : d.pin || '').trim();
  if (pinHash_(given) !== cur) {
    C.put('PIN_FAILS', String(fails + 1), 600);
    return pinOut_({ ok: false, err: 'pin', msg: 'الرقم السري غير صحيح' });
  }
  if (d.action === 'pinCheck') return pinOut_({ ok: true, v: ver });

  var pin = String(d.pin || '').trim();
  if (!/^\S{4,32}$/.test(pin)) return pinOut_({ ok: false, err: 'bad', msg: 'الرقم الجديد 4 خانات على الأقل' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    ver = +(P.getProperty('PIN_V') || 0) + 1;
    P.setProperties({ PIN_H: pinHash_(pin), PIN_V: String(ver) });
  } finally { lock.releaseLock(); }
  return pinOut_({ ok: true, v: ver });
}
