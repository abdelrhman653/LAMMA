// server.js — ربط الدفع الحقيقي (Node/Express)
// npm i express
const express=require("express"),app=express();app.use(express.json());
app.post("/api/create-payment",async(req,res)=>{
  // استخدم متغيرات البيئة فقط:
  // PAYMOB_API_KEY / PAYMOB_PUBLIC_KEY / PAYMOB_INTEGRATION_ID
  // أنشئ Intention من الخادم ثم أعد checkoutUrl للمتصفح.
  // لا تضع الـSecret Key داخل app.js.
  res.status(501).json({error:"Connect this endpoint to your Paymob account"});
});
app.post("/api/paymob/webhook",express.raw({type:"application/json"}),(req,res)=>{
  // تحقّق من HMAC ثم غيّر paymentStatus إلى paid في قاعدة البيانات.
  // لا تفعّل الرابط اعتمادًا على redirect من المتصفح وحده.
  res.sendStatus(200);
});
app.listen(process.env.PORT||3000);
