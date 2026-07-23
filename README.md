# Budget Management System

نظام إدارة طلبات الميزانيات والاحتياجات الفنية

## الميزات الرئيسية

- ✅ 4 أنواع طلبات (ميزانية شهرية، ميزانية عاجلة، احتياج فني، بدل مواصلات)
- ✅ لوحة تحكم مع إحصائيات وتصفية وبحث
- ✅ إرسال إيميلات تلقائية احترافية
- ✅ نظام ردود مع Gmail Threads
- ✅ تسجيل جميع العمليات (Workflow)
- ✅ حماية CSRF و Rate Limiting
- ✅ تصميم Responsive مع Material Design
- ✅ Batch Operations للأداء العالي

## الهيكل

```
budget-management-system/
├── apps-script/
│   ├── Code.gs           # الملف الرئيسي
│   ├── Config.gs         # جميع الإعدادات
│   ├── Database.gs       # عمليات قاعدة البيانات
│   ├── Email.gs          # إرسال الإيميلات
│   ├── ReplyService.gs   # نظام الردود
│   ├── Validation.gs     # التحقق من البيانات
│   ├── Utils.gs          # الدوال المساعدة
│   ├── API.gs            # نقاط الاتصال
│   └── html/
│       ├── index.html    # الواجهة الرئيسية
│       ├── style.css     # التنسيقات
│       ├── script.js     # المنطق البرمجي
│       └── components.js # المكونات
```

## خطوات الإعداد

### 1. إنشاء Google Spreadsheet

1. اذهب إلى [Google Sheets](https://sheets.google.com)
2. أنشئ جدول جديد
3. انسخ الـ ID من الرابط (الجزء بين `/d/` و `/edit`):
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

### 2. إنشاء Google Apps Script

1. من الجدول، اذهب إلى **Extensions > Apps Script**
2. احذف المحتوى الافتراضي
3. أنشئ الملفات التالية:

#### للملفات.gs:
- اضغط على **+** بجانب **Files**
- اختر **Script**
- أسمِ الملف وأضف الامتداد .gs
- انسخ محتوى الملف المناسب

#### لملفات HTML:
- اضغط على **+** بجانب **Files**
- اختر **HTML**
- أسمِ الملف بدون امتداد (مثل: index)
- انسخ المحتوى المناسب

### 3. تعديل الإعدادات

افتح `Config.gs` وعدّل:

```javascript
SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',  // ← ضع ID الجدول

EMAIL: {
  ADMIN: 'admin@yourdomain.com',        // ← إيميل المسؤول
  WATCHER_1: 'watcher1@yourdomain.com', // ← متابع 1
  WATCHER_2: 'watcher2@yourdomain.com', // ← متابع 2
},
```

### 4. تشغيل النظام

1. اضغط **Run** > **init**
2. امنح الصلاحيات المطلوبة
3. اضغط **Run** > **setupTriggers**

### 5. نشر Web App

1. اضغط **Deploy** > **New deployment**
2. اختر **Web app**
3. اضبط الإعدادات:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. اضغط **Deploy**
5. انسخ الرابط

### 6. إنشاء الشيتات

النظام يُنشئ الشيتات تلقائياً عند التشغيل:
- **Requests**: جميع الطلبات
- **Items**: بنود الصرف
- **Workflow**: سجل العمليات
- **Replies**: الردود

## الاستخدام

### إرسال طلب

1. افتح الويب آب
2. اختر نوع الطلب
3. املأ جميع الحقول المطلوبة
4. اضغط **إرسال الطلب**
5. سيتم إرسال إيميل تلقائي للمسؤول

### عرض الطلبات

1. اضغط **لوحة التحكم**
2. استخدم البحث أو التصفية
3. اضغط **عرض** لتفاصيل أي طلب

### تحديث حالة الطلب

1. افتح تفاصيل الطلب
2. اختر الحالة الجديدة
3. اضغط **تحديث الحالة**
4. سيتم إرسال إيميل إشعار لمقدم الطلب

### إرسال رد

1. افتح تفاصيل الطلب
2. اكتب الرد في المربع
3. اضغط **إرسال الرد**
4. سيتم إرسال الرد في نفس Thread الإيميل

## ملاحظات تقنية

### الأداء
- يستخدم Batch Write للكتابة المتعددة
- CacheService للتخزين المؤقت
- LockService لمنع التعارض

### الحماية
- CSRF Token لكل طلب
- Rate Limiting
- Input Sanitization
- Duplicate Detection

### Maintenance
- يُفحص الردود كل دقيقة عبر Trigger
- يمكن تشغيل checkReplies يدوياً من القائمة
- أخطاء النظام تُسجّل في Error Logs

## استكشاف الأخطاء

### إذا لم يعمل النظام

1. تأكد من صحة SPREADSHEET_ID
2. تأكد من منح الصلاحيات
3. تحقق من Error Logs في Apps Script

### إذا لم تصل الإيميلات

1. تأكد من صحة عناوين البريد
2. تحقق من spam folder
3. تأكد من تفعيل Gmail API

## التحديثات

### إضافة قطاع جديد

عدّل مصفوفة SECTORS في `Config.gs`:

```javascript
SECTORS: [
  'الجامعة',
  'الكلية',
  // أضف القطاع الجديد هنا
],
```

### إضافة محافظة جديدة

عدّل مصفوفة GOVERNORATES في `Config.gs`.

## الدعم

لأي مشاكل، تحقق من:
1. Google Apps Script Dashboard
2. Execution Log
3. Error Logs في Properties

---

**الإصدار:** 1.0.0
**التوافق:** Google Apps Script, Google Sheets, GmailApp
