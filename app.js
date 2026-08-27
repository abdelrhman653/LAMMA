import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const cfg = window.FIREBASE_CONFIG || {};
const configured = !!(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
const cloudCfg = window.CLOUDINARY_CONFIG || {};
const cloudConfigured = !!(cloudCfg.cloudName && cloudCfg.uploadPreset);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const CONTACT = window.CONTACT || {whatsapp:"201555898862",wallet:"01128685766"};
let auth, db, currentUser, unsubscribeInvites;
let state = { step:1, theme:"noir", coverData:null, galleryFiles:[], musicFile:null, paymentProofFile:null, userDoc:null };

const builder = $("#builder"), result = $("#result"), invitation = $("#invitation"), authView=$("#authView"), paymentView=$("#paymentView"), dashboardView=$("#dashboardView");
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}
function show(view){[authView,paymentView,dashboardView,builder,result,invitation].forEach(x=>x?.classList.add("hidden"));view?.classList.remove("hidden");window.scrollTo(0,0)}
function wa(number,text){return `https://wa.me/${number}?text=${encodeURIComponent(text||"")}`}

function firebaseInit(){
  if(!configured){ show(authView); $("#firebaseWarning").classList.remove("hidden"); return false; }
  const app=initializeApp(cfg); auth=getAuth(app); db=getFirestore(app); return true;
}

async function userDoc(uid){const s=await getDoc(doc(db,"users",uid));return s.exists()?s.data():null}
async function ensureUserDoc(user){
  const ref=doc(db,"users",user.uid), snap=await getDoc(ref);
  if(!snap.exists()) await setDoc(ref,{uid:user.uid,email:user.email||"",name:user.displayName||"",paymentStatus:"unpaid",createdAt:serverTimestamp()});
  return userDoc(user.uid);
}
function setAuthMode(mode){$("#loginForm").classList.toggle("hidden",mode!=="login");$("#registerForm").classList.toggle("hidden",mode!=="register");$$('.auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));}
$$('.auth-tab').forEach(b=>b.onclick=()=>setAuthMode(b.dataset.mode));

$("#loginForm").onsubmit=async e=>{e.preventDefault(); if(!configured)return; try{await signInWithEmailAndPassword(auth,$("#loginEmail").value.trim(),$("#loginPassword").value);toast("تم تسجيل الدخول")}catch(err){toast(authError(err))}};
$("#registerForm").onsubmit=async e=>{e.preventDefault(); if(!configured)return; const email=$("#regEmail").value.trim(), pass=$("#regPassword").value, name=$("#regName").value.trim(); if(pass.length<6){toast("كلمة المرور لازم تكون 6 أحرف على الأقل");return} try{const c=await createUserWithEmailAndPassword(auth,email,pass);await updateProfile(c.user,{displayName:name});await ensureUserDoc(c.user);toast("تم إنشاء الحساب")}catch(err){toast(authError(err))}};
$("#paymentLogoutBtn").onclick=()=>signOut(auth);
$("#dashboardLogoutBtn").onclick=()=>signOut(auth);
function authError(e){const m={"auth/email-already-in-use":"الإيميل مستخدم بالفعل","auth/invalid-credential":"الإيميل أو كلمة المرور غير صحيحة","auth/invalid-email":"الإيميل غير صحيح","auth/weak-password":"كلمة المرور ضعيفة","auth/network-request-failed":"مشكلة في الاتصال"};return m[e.code]||"حصل خطأ، حاول تاني"}

async function renderAccount(user){
  currentUser=user;
  state.userDoc=await ensureUserDoc(user);
  $("#accountName").textContent=user.displayName||user.email;
  $("#accountEmail").textContent=user.email;

  // تجربة المنصة المطلوبة: بعد التسجيل يدخل المستخدم مباشرة إلى إنشاء الدعوة،
  // بدون إجباره على الدفع أو المرور بشاشة أخرى أولاً.
  // الدفع يظل موجودًا في المشروع ويمكن تفعيله لاحقًا من لوحة الإدارة إذا أردت.
  show(dashboardView);
  loadInvites();
}
function renderPaymentStatus(){
  const s=state.userDoc?.paymentStatus||"unpaid";
  const box=$("#paymentStatus");
  const map={unpaid:["لم يتم تسجيل الدفع بعد","حوّل المبلغ على المحفظة أو تواصل معنا على واتساب ثم أرسل إثبات الدفع."],pending:["جاري مراجعة الدفع","تم إرسال الطلب. بعد تأكيد الأدمن هيتفتح لك إنشاء الدعوة."],approved:["تم تأكيد الدفع ✓","تقدر تبدأ إنشاء دعوتك الآن."],rejected:["الدفع يحتاج مراجعة","تواصل معنا على واتساب للتأكد من البيانات."]};
  box.innerHTML=`<b>${map[s][0]}</b><small>${map[s][1]}</small>`; box.dataset.status=s;
  $("#paymentStartBuilderBtn").classList.toggle("hidden",s!=="approved");
  $("#paymentForm").classList.toggle("hidden",s!=="unpaid"&&s!=="rejected");
}
$("#whatsPay").onclick=()=>location.href=wa(CONTACT.whatsapp,"أهلاً، أريد عمل دعوة إلكترونية وعايز أعرف سعرها وطريقة الدفع.");
$("#whatsContact").onclick=()=>location.href=wa(CONTACT.whatsapp,"أهلاً، أنا سجلت في منصة الدعوات وأحتاج مساعدة بخصوص الدفع.");
$("#walletNumber").textContent=CONTACT.wallet;
$("#walletCopy").onclick=async()=>{await navigator.clipboard.writeText(CONTACT.wallet);toast("تم نسخ رقم المحفظة")};
$("#proof").onchange=e=>state.paymentProofFile=e.target.files[0];
$("#paymentForm").onsubmit=async e=>{
  e.preventDefault(); if(!currentUser||!configured)return;
  const amount=$("#payAmount").value.trim(), refNo=$("#payRef").value.trim(), file=state.paymentProofFile;
  if(!amount||!refNo||!file){toast("اكتب المبلغ ورقم العملية وارفع صورة الإثبات");return}
  if(file.size>8*1024*1024){toast("صورة الإثبات لازم تكون أقل من 8MB");return}
  try{
    $("#paymentSubmit").disabled=true; $("#paymentSubmit").textContent="جاري الإرسال...";
    if(!cloudConfigured){toast("لازم تضيف Cloudinary Cloud Name و Upload Preset");return}
    const proofUrl=await uploadFile(file,`lamma/payment-proofs/${currentUser.uid}`);
    await addDoc(collection(db,"payments"),{uid:currentUser.uid,email:currentUser.email,name:currentUser.displayName||"",amount,reference:refNo,proofUrl,status:"pending",createdAt:serverTimestamp()});
    await updateDoc(doc(db,"users",currentUser.uid),{paymentStatus:"pending",lastPaymentAt:serverTimestamp()}); state.userDoc=await userDoc(currentUser.uid); renderPaymentStatus(); toast("اترسل للمراجعة بنجاح");
  }catch(err){console.error(err);toast("تعذر إرسال الإثبات، راجع إعداد Firebase")}
  finally{$("#paymentSubmit").disabled=false;$("#paymentSubmit").textContent="إرسال للمراجعة"}
};
$("#paymentStartBuilderBtn").onclick=()=>{show(builder);setStep(1)};
$("#dashboardNewInvite").onclick=()=>{show(builder);setStep(1)};

// ---------- Builder ----------
function setStep(n){state.step=n;$$('.form-step').forEach(x=>x.classList.toggle('active',+x.dataset.step===n));$("#stepCurrent").textContent=n;$("#progressBar").style.width=(n/6*100)+"%";$("#backBtn").classList.toggle('hidden',n===1);$("#nextBtn").classList.toggle('hidden',n===6);$("#publishBtn").classList.toggle('hidden',n!==6);}
function requiredOk(){const active=$(`.form-step[data-step="${state.step}"]`);for(const f of [...active.querySelectorAll('[required]')]){if(!f.value.trim()){f.focus();toast('كمّل البيانات المطلوبة الأول');return false}}return true}
$("#nextBtn").onclick=()=>{if(requiredOk()&&state.step<6)setStep(state.step+1)};$("#backBtn").onclick=()=>{if(state.step>1)setStep(state.step-1)};
$$('.theme-card').forEach(c=>c.onclick=()=>{$$('.theme-card').forEach(x=>x.classList.remove('selected'));c.classList.add('selected');state.theme=c.dataset.theme});
$("#cover").onchange=e=>state.coverData=e.target.files[0];$("#gallery").onchange=e=>{state.galleryFiles=[...e.target.files].slice(0,20);$("#galleryPreview").innerHTML=state.galleryFiles.map(f=>`<span>${escapeHtml(f.name)}</span>`).join('')};$("#music").onchange=e=>state.musicFile=e.target.files[0];
async function uploadFile(file,folder){
  if(!cloudConfigured) throw new Error("Cloudinary is not configured");
  const endpoint=`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudCfg.cloudName)}/auto/upload`;
  const form=new FormData();
  form.append("file",file);
  form.append("upload_preset",cloudCfg.uploadPreset);
  if(folder) form.append("folder",folder);
  const response=await fetch(endpoint,{method:"POST",body:form});
  const data=await response.json();
  if(!response.ok || !data.secure_url) throw new Error(data.error?.message||"Cloudinary upload failed");
  return data.secure_url;
}
async function collectAndPublish(){
  const slug=$("#slug").value.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff-]+/g,"-").replace(/^-|-$/g,"");
  if(!slug){$("#slug").focus();toast("اكتب اسم للرابط");return}
  const base={ownerId:currentUser.uid,groom:$("#groom").value.trim(),bride:$("#bride").value.trim(),headline:$("#headline").value.trim()||"يسعدنا أن نشارككم أجمل أيامنا",welcome:$("#welcome").value.trim()||"وجودكم هو أجمل هدية لنا",eventDate:$("#eventDate").value,eventTime:$("#eventTime").value,eventName:$("#eventName").value.trim()||"ليلة العمر",city:$("#city").value.trim(),venue:$("#venue").value.trim(),maps:$("#maps").value.trim(),rsvp:$("#rsvp").checked,showMaps:$("#showMaps").checked,hearts:$("#hearts").checked,theme:state.theme,slug,updatedAt:serverTimestamp()};
  try{
    $("#publishBtn").disabled=true;$("#publishBtn").textContent="جاري تجهيز الدعوة...";
    if(state.coverData)base.coverUrl=await uploadFile(state.coverData,`invitations/${currentUser.uid}/${slug}/cover-${Date.now()}`);
    if(state.galleryFiles.length)base.galleryUrls=await Promise.all(state.galleryFiles.map((f,i)=>uploadFile(f,`invitations/${currentUser.uid}/${slug}/gallery-${Date.now()}-${i}`)));
    if(state.musicFile)base.musicUrl=await uploadFile(state.musicFile,`invitations/${currentUser.uid}/${slug}/music-${Date.now()}`);
    // نمنع الكتابة فوق دعوة شخص آخر بنفس الرابط.
    const existing=await getDoc(doc(db,"invitations",slug));
    if(existing.exists() && existing.data().ownerId!==currentUser.uid){
      throw new Error("الرابط مستخدم بالفعل، اختار اسم رابط مختلف");
    }
    await setDoc(doc(db,"invitations",slug),base,{merge:true});
    const url=`${location.origin}${location.pathname}?invite=${encodeURIComponent(slug)}`;
    $("#generatedLink").textContent=url;
    show(result);
    toast("الدعوة اتجهزت والرابط جاهز");
  }catch(e){
    console.error(e);
    if(e.message?.includes("Cloudinary")) toast("تأكد من إعداد Cloudinary وUpload Preset");
    else if(e.message?.includes("الرابط مستخدم")) toast(e.message);
    else toast("حصل خطأ أثناء النشر، حاول مرة تانية");
  }
  finally{$("#publishBtn").disabled=false;$("#publishBtn").textContent="إنشاء الدعوة ✦"}
}
$("#inviteForm").onsubmit=e=>{e.preventDefault();if(requiredOk())collectAndPublish()};
$("#copyLink").onclick=async()=>{await navigator.clipboard.writeText($("#generatedLink").textContent);toast("تم نسخ الرابط")};$("#shareInvite").onclick=async()=>{const url=$("#generatedLink").textContent;if(navigator.share)await navigator.share({title:'دعوتي',text:'شرفونا في مناسبتنا ❤️',url});else{await navigator.clipboard.writeText(url);toast('تم نسخ الرابط')}};$("#openInvite").onclick=()=>location.href=$("#generatedLink").textContent;$("#newInvite").onclick=()=>show(dashboardView);

async function loadInvites(){
  if(unsubscribeInvites)unsubscribeInvites(); const q=query(collection(db,"invitations"),where("ownerId","==",currentUser.uid)); unsubscribeInvites=onSnapshot(q,s=>{$("#myInvites").innerHTML=s.empty?'<div class="empty">لسه مفيش دعوات. ابدأ أول دعوة ✨</div>':s.docs.map(d=>{const x=d.data();return `<div class="invite-row"><div><b>${escapeHtml(x.groom||'')} ♥ ${escapeHtml(x.bride||'')}</b><small>${escapeHtml(x.venue||'')} · ${escapeHtml(x.eventDate||'')}</small></div><button data-slug="${escapeHtml(d.id)}" class="open-row">فتح</button></div>`}).join('');$$('.open-row').forEach(b=>b.onclick=()=>location.href=`${location.pathname}?invite=${encodeURIComponent(b.dataset.slug)}`)})
}

// ---------- Public invitation ----------
async function renderInvite(slug){
  if(!configured){toast('الدعوة تحتاج ربط Firebase');return}
  const s=await getDoc(doc(db,"invitations",slug)); if(!s.exists()){toast('الدعوة غير موجودة');return} const d=s.data(); show(invitation); invitation.className=`invitation theme-${d.theme||'noir'}`;
  $("#inviteNames").innerHTML=`${escapeHtml(d.groom)} <i>♥</i> ${escapeHtml(d.bride)}`;$("#footerNames").innerHTML=`${escapeHtml(d.groom)} <i>♥</i> ${escapeHtml(d.bride)}`;$("#inviteHeadline").textContent=d.headline;$("#inviteWelcome").textContent=d.welcome;$("#inviteDate").textContent=formatDate(d.eventDate,d.eventTime);$("#inviteEventName").textContent=d.eventName;$("#inviteVenue").textContent=d.venue;$("#inviteLocation").textContent=d.city||'';$("#inviteTime").textContent=d.eventTime?`الساعة ${d.eventTime}`:'';
  if(d.coverUrl)$("#inviteCover").style.backgroundImage=`url('${d.coverUrl}')`;$("#mapsBtn").classList.toggle('hidden',!(d.maps&&d.showMaps));if(d.maps)$("#mapsBtn").href=d.maps;$("#rsvpSection").classList.toggle('hidden',!d.rsvp);$("#inviteGallery").innerHTML=(d.galleryUrls||[]).map(x=>`<img loading="lazy" src="${x}" alt="ذكرى">`).join('');if(d.musicUrl){$("#inviteMusic").src=d.musicUrl;$("#musicToggle").classList.remove('hidden')};startCountdown(`${d.eventDate}T${d.eventTime||'00:00'}`);if(d.hearts)makeHearts();
  $("#rsvpForm").onsubmit=async e=>{e.preventDefault();try{await addDoc(collection(db,"invitations",slug,"rsvps"),{name:$("#guestName").value.trim(),count:+$("#guestCount").value||1,message:$("#guestMessage").value.trim(),createdAt:serverTimestamp()});$("#rsvpForm").classList.add('hidden');$("#rsvpThanks").classList.remove('hidden')}catch{toast('تعذر تسجيل الحضور')}};
}
function formatDate(d,t){try{return new Intl.DateTimeFormat('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(new Date(`${d}T${t||'00:00'}`))}catch{return d}}
let timer;function startCountdown(target){clearInterval(timer);const tick=()=>{let diff=new Date(target)-new Date();if(diff<=0)return;let s=Math.floor(diff/1000),days=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),sec=s%60;$("#cdDays").textContent=String(days).padStart(2,'0');$("#cdHours").textContent=String(h).padStart(2,'0');$("#cdMinutes").textContent=String(m).padStart(2,'0');$("#cdSeconds").textContent=String(sec).padStart(2,'0')};tick();timer=setInterval(tick,1000)}
function makeHearts(){const l=$("#heartsLayer");if(!l)return;setInterval(()=>{if(document.hidden)return;const h=document.createElement('span');h.className='heart';h.textContent=Math.random()>.5?'♥':'✦';h.style.left=Math.random()*100+'%';h.style.fontSize=(10+Math.random()*14)+'px';h.style.animationDuration=(5+Math.random()*5)+'s';l.appendChild(h);setTimeout(()=>h.remove(),11000)},800)}
$("#enterInvite").onclick=()=>{$("#inviteBody").scrollIntoView({behavior:'smooth'});const a=$("#inviteMusic");if(a.src)a.play().catch(()=>{})};$("#musicToggle").onclick=()=>{const a=$("#inviteMusic");if(a.paused){a.play();$("#musicToggle").textContent='❚❚'}else{a.pause();$("#musicToggle").textContent='♫'}};
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

async function boot(){
  if(!firebaseInit())return;
  const invite=new URLSearchParams(location.search).get('invite');if(invite){await renderInvite(invite);return}
  onAuthStateChanged(auth,async user=>{if(user)await renderAccount(user);else show(authView)});
}
boot();
