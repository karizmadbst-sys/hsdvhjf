# 📱 دليل تحويل اللعبة إلى تطبيق Android APK عبر GitHub Actions

تم تجهيز المشروع بالكامل ليتم تحويله إلى تطبيق أندرويد بصيغة **APK** تلقائياً عبر **GitHub Actions Workflow** باستخدام محرك **Capacitor** المخصص للألعاب ثلاثية الأبعاد (Three.js / WebGL).

---

## 🚀 كيف يعمل النظام؟

1. **ملف الـ Workflow جاهز في المشروع**:
   - المسار: `.github/workflows/build-apk.yml`
   - يقوم ببناء ملفات الويب (`npm run build`).
   - يقوم بمزامنة مشروع الأندرويد الأصلي (`npx cap sync android`).
   - يجهّز بيئة أندرويد كاملة (Node.js 22 LTS + Java 21 + Android SDK).
   - يقوم بتجميع وبناء ملف الـ APK (`./gradlew assembleDebug`).
   - يرفع ملف الـ APK كـ **Artifact** جاهز للتحميل، أو ينشره في **Releases**.

2. **تسريع العتاد والرسوميات ثلاثية الأبعاد**:
   - تم تفعيل `android:hardwareAccelerated="true"` و `OpenGL ES 3.0` في ملف `AndroidManifest.xml` لضمان أعلى أداء وسلاسة لإطارات اللعبة على شاشات الهواتف.

---

## 📋 خطوات بناء وتحميل الـ APK على GitHub:

### الخطوة 1: رفع المشروع إلى مستودع GitHub
إذا لم تكن قد رفعت المشروع بعد:
```bash
git init
git add .
git commit -m "Add Android APK build workflow"
git branch -M main
git remote add origin https://github.com/اسم-حسابك/اسم-المستودع.git
git push -u origin main
```

### الخطوة 2: تشغيل الـ Workflow
بمجرد عمل `push`، سيبدأ الـ Workflow بالعمل تلقائياً. كما يمكنك تشغيله يدوياً في أي وقت:
1. ادخل إلى صفحة مستودعك على **GitHub**.
2. اضغط على تبويب **Actions** في الأعلى.
3. من القائمة الجانبية اليسرى، اختر **🔨 Build Android APK (ECHO)**.
4. اضغط على زر **Run workflow** ثم اختر الفرع واضغط **Run workflow**.

### الخطوة 3: تحميل ملف الـ APK
1. انتظر حتى يكتمل البناء (يستغرق حوالي دقيقتين وستظهر علامة صح خضراء ✅).
2. اضغط على الـ Run المكتمل.
3. انزل لأسفل الصفحة إلى قسم **Artifacts**.
4. اضغط على **ECHO-Android-APK** لتحميل الملف المضغوط الذي يحتوي على:
   - `ECHO-The-World-Remembers-debug.apk`

---

## 📲 تثبيت الـ APK على الهاتف:
1. انقل ملف `ECHO-The-World-Remembers-debug.apk` إلى هاتفك (عبر كابل، واتساب، تلغرام، أو تحميله مباشرة من متصفح الهاتف).
2. اضغط على الملف للتثبيت.
3. إذا طلب الهاتف إذناً، فعّل خيار **"السماح بالتثبيت من هذا المصدر" (Install unknown apps)**.
4. ستفتح اللعبة مباشرة كأي تطبيق أصلي مثبت على الأندرويد بشاشة كاملة وبأعلى أداء!

---

## 🏷️ إنشاء إصدار رسمي (Release) تلقائياً:
إذا أردت أن يقوم GitHub بإنشاء Release مع إرفاق الـ APK تلقائياً للجميع:
```bash
git tag v1.0.0
git push origin v1.0.0
```
وسيقوم الـ Workflow برفع ملف الـ APK تلقائياً في صفحة **Releases** للمستودع.
