# V2 — منصة دعوات إلكترونية

### رحلة العميل الجديدة
1. صفحة Designs فيها عدة تصميمات.
2. كل تصميم له **معاينة كاملة** قبل اختيار العميل.
3. تطبيق التصميم.
4. إدخال كل بيانات الدعوة.
5. إرسال الطلب على WhatsApp للمراجعة والاتفاق.
6. الانتقال لصفحة الدفع.
7. **لا يتم تفعيل الرابط قبل نجاح الدفع.**
8. بعد تأكيد الدفع من الـbackend/webhook يظهر الرابط.

### الأفكار المدمجة
- Multiple templates.
- Full preview قبل البيانات.
- Bottom navigation داخل الدعوة.
- Gallery.
- Countdown.
- Location.
- RSVP + عداد مرافقين.
- تهاني.
- Add to calendar.
- Music.
- Mobile-first.

### الدفع الحقيقي
تم تجهيز `server.js` كمكان للـBackend. في مصر يمكن ربط Paymob Hosted Checkout؛ مفاتيح السر وWebhook/HMAC يجب أن تبقى على الخادم.
ضع:
PAYMOB_API_KEY
PAYMOB_PUBLIC_KEY
PAYMOB_INTEGRATION_ID
PAYMOB_HMAC_SECRET

ثم اربط `/api/create-payment` و`/api/paymob/webhook`.
لا تعتبر رجوع العميل من صفحة الدفع وحده إثباتًا للنجاح؛ التأكيد يجب أن يأتي من Webhook موثوق.

### إعداد واتساب
غيّر `CONFIG.whatsapp` في `app.js` إلى رقم النشاط بصيغة دولية.

### مهم
هذه V2 واجهة وتجربة كاملة، لكن التخزين الحالي localStorage للعرض. للإطلاق الحقيقي:
Firebase Auth + Firestore + Storage + Backend payment + Security Rules.
