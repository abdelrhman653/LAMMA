/*
  إعداد Firebase للإنتاج
  ------------------------------------------
  1) أنشئ Firebase Web App.
  2) فعّل Authentication (Email/Password أو Google).
  3) فعّل Firestore Database.
  4) فعّل Storage.
  5) ضع إعدادات مشروعك هنا.
  6) في app.js استبدل localStorage بطبقة Firebase عند النشر الحقيقي.

  مهم: لا تضع service-account private key في المتصفح.
*/
window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
