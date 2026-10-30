const O=(a)=>a.map((t,i)=>`<div><b>${i+1}</b><span>${t}</span></div>`).join("");
window.CFG={b1:"#fff4f7",b2:"#fde3ec",
hook:{dur:4.2,cap:`<span class="tag">📊 صوّتوا</span><br>كيف تنقلون مرضاكم القدامى<br>إلى نظام جديد؟`,
 extra:O(["تكتبونهم واحداً واحداً","تبدؤون من الصفر","ملف إكسل… بضغطة واحدة"]),extraTop:640},
steps:[
 {dur:3.3,img:"i1.png",cap:`<span class="tag">الخطوة 1</span><br>اضغطوا «استيراد من إكسل»`,ring:[208,118,166,44],tap:[208,118,166,44]},
 {dur:3.3,img:"i2.png",cap:`<span class="tag">الخطوة 2</span><br>يتعرّف تلقائياً على<br>أعمدة ملفكم`,ring:[14,300,362,250]},
 {dur:3.5,img:"i3.png",cap:`<span class="tag">الخطوة 3</span><br>معاينة قبل الحفظ،<br>والمكرر يُتخطّى`,ring:[14,425,362,335],tap:[199,788,175,44]},
 {dur:3.2,img:"i5.png",cap:`<span class="hl">8 مرضى</span> أُضيفوا<br>في ثوانٍ ✓`,ring:[106,714,180,52]}],
q:{dur:3.4,cap:`وأنتم؟ ما خياركم:<br><span class="hl">1</span> أم <span class="hl">2</span> أم <span class="hl">3</span>؟<br><span class="cmt">💬 اكتبوا رقمكم في التعليقات</span>`,
 extra:O(["تكتبونهم واحداً واحداً","تبدؤون من الصفر","ملف إكسل… بضغطة واحدة"]),extraTop:760},
cta:{dur:4}};
