/* ===== الرقم السري للمدرب على خادم Google =====
   يجعل تغيير الرقم السري للمدرب من الموقع يسري على كل الأجهزة.

   طريقة الإضافة (مرة واحدة):
   1. افتح مشروع Google Apps Script الخاص بنتائج المتدربين.
   2. الصق هذا الملف كله في آخر الكود (أو في ملف جديد داخل المشروع نفسه).
   3. في أول سطر داخل الدالة doPost(e) أضف هذا السطر:
        var pinR = pinRoute_(e); if (pinR) return pinR;
   4. احفظ، ثم: نشر ← إدارة عمليات النشر ← ✏️ تعديل ← الإصدار: إصدار جديد ← نشر.
      (لا تنشئ عملية نشر جديدة، حتى يبقى رابط الخادم كما هو في الموقع.)

   الرقم السري يُحفظ مشفّرًا (hash) في خصائص السكربت، ولا يظهر في الموقع.
   الرقم الافتراضي هو الرقم الحالي إلى أن تغيّره من الموقع: ⋯ ← 🔑 تغيير الرقم السري للمدرب. */

var PIN_DEFAULT_H = 'ba1ab459'; // تشفير الرقم السري الحالي المكتوب في الموقع

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
