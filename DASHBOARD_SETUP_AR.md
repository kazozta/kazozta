# إعداد لوحة KAZOZTA

اللوحة إضافة إلى المتجر الحالي ولا تنقل ملفات الموقع. ملفات `admin/` و`functions/` و`migrations/` في جذر المستودع، وملف تتبع المحاولة `js/order-attempt-tracker.js`.

## النشر

اربط المستودع `kazozta/kazozta` بمشروع Cloudflare Pages، مع الفرع `main` وأمر البناء `exit 0` ومجلد الإخراج `.`. اختبر رابط المعاينة `pages.dev` قبل دمج التغييرات أو لمس الدومين الحالي.

## قاعدة البيانات

1. أنشئ D1 باسم `kazozta-dashboard`.
2. نفّذ ملفات الترحيل بالترتيب: `migrations/0001_init.sql` ثم `migrations/0002_auth_sessions.sql`.
3. في Pages > Settings > Functions أضف D1 binding اسمه `DB` واختر القاعدة في بيئتي Preview وProduction، ثم أعد النشر.

## دخول Google

تسجيل Google لا يحتاج بطاقة دفع ولا تفعيل تجربة Cloud. لا تضغط «Start free» أو تفعّل Billing؛ اللوحة تطلب فقط صلاحيات الهوية الأساسية `openid email profile`.

1. في Google Cloud Console أنشئ مشروعًا ثم افتح Google Auth Platform. أكمل Branding (اسم التطبيق `KAZOZTA Dashboard` وبريد الدعم) وAudience. اجعل التطبيق External إذا كانت الحسابات من خارج Workspace.
2. أنشئ OAuth Client من النوع Web application. أضف Authorized redirect URI لكل بيئة، حرفيًا:
   - `https://<رابط-معاينة-pages>.pages.dev/api/auth/callback`
   - `https://kazozta.pages.dev/api/auth/callback`
   قيمة المعاينة هي اسم النطاق الثابت للفرع في صفحة نشر Cloudflare، وليست رابط commit عشوائيًا. لا تستخدم wildcard.
3. في Google Cloud وCloudflare Pages لا تضع Client Secret في المستودع أو في ملف محلي. في Pages > Settings > Variables and Secrets أضف لكل من Preview وProduction:
   - `GOOGLE_CLIENT_ID` كمتغير نصي.
   - `GOOGLE_CLIENT_SECRET` كـ Secret مشفّر.
   - `GOOGLE_REDIRECT_URI` مطابقًا تمامًا لعنوان callback الخاص بتلك البيئة.
4. أعد نشر Preview. سجّل الدخول بحساب المالك `kazozta1@gmail.com`، ثم اختبر أن حسابًا آخر لا يرى البيانات. بعد التأكد فقط افتح PR وادمج التغييرات يدويًا.

الحسابات الأخرى لا تدخل تلقائيًا: يضيف المالك المديرين والموظفين من قسم «فريق العمل». تُراجع صلاحية الدور في D1 مع كل طلب. يحتاج أعضاء الفريق أيضًا إلى السماح لهم داخل إعدادات جمهور التطبيق/الاختبار في Google إن كان التطبيق في وضع Testing. لا تترك بيانات التطبيق في وضع الاختبار عند توسيع الاستخدام؛ راجع متطلبات النشر والتحقق المناسبة لدى Google.

## ما تسجله اللوحة

- زيارات وجلسات زوار مجهولة، دون إرسال بيانات هوية الزائر.
- كل ضغط يفتح WhatsApp يسجل كمحاولة، وليس طلبًا مؤكدًا.
- الموظف يطالع البيانات؛ المدير والمالك يمكنهما تأكيد الطلب. المالك وحده يدير أعضاء الفريق.
- الأصناف والكميات والمجموع قبل الضريبة وضريبة ١٤٪ والإجمالي.

السعر المرسل من المتصفح ليس مرجعًا ماليًا رسميًا؛ تحقّق من الأسعار على الخادم قبل الاعتماد المحاسبي. حماية المحاولات العامة من الإساءة تتطلب تحديد معدل مناسب في Cloudflare.
