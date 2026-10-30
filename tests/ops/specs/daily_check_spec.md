# الفحص اليومي لتطبيق نبض (يُنفَّذ داخل المحادثة الرئيسية)

الهدف: التأكد أن كل شيء يعمل فعلاً كما يراه الطبيب والمريض والزائر، واكتشاف أي عطل وإصلاحه فوراً. ردود المستخدم بالعامية السورية.
درس 20 تشرين الأول: الفحص كان يختبر الكود والنسخة التجريبية فقط، ففاته أن زر تنزيل التطبيق من الموقع لا يعمل. لذلك أُضيف فحص الموقع الحقيقي (الخطوة 3) ومراجعة كل التشغيلات الفاشلة (الخطوة 2).
درس 30 تشرين الأول: بيئة العمل قد تُمسح (يبقى فقط مستودع nabd). كل الأدوات والمواصفات محفوظة في المستودع: tests/ops/specs و tests/ops/tools. إن لم تجد ملفاً في /home/claude أو scratchpad فخذه من المستودع (git pull أولاً، وإن لم يوجد المستودع: git clone https://github.com/mohamedfayzyasenalsabagh-create/nabd.git /home/claude/nabd).

## الخطوات
1. `cd /home/claude/nabd && git pull -q`. ثم جهّز الأدوات: `bash tests/ops/tools/setup.sh` (ينسخ الأدوات إلى scratchpad ويثبّت الخطوط إن لزم).
2. GitHub (R=repos/mohamedfayzyasenalsabagh-create/nabd):
   - شغّل الفحوص اليومية الآن: `gh api -X POST $R/actions/workflows/errors.yml/dispatches -f ref=main` و`live.yml` بالطريقة نفسها، وانتظر انتهاءهما.
   - كل التشغيلات خلال آخر 24 ساعة: `gh api "$R/actions/runs?per_page=80" --jq '.workflow_runs[]|select(.created_at > "<أمس>")|.name+" "+(.conclusion//.status)'` — أي failure في أي workflow (نشر Firebase، Pages، الأندرويد، القواعد، e2e، الحذف النهائي) يُعدّ عطلاً يُفحص سببه ويُصلح.
   - اقرأ النتائج من فرع ci-results: `.results/errors.txt` (أعطال أجهزة المستخدمين)، `.results/live.txt` (الموقع الحقيقي)، `.results/e2e/result.txt`، `.results/rules-result.txt`، `.results/purge.txt`.
   - `.results/usage.txt`: استهلاك Firestore مقارنة بالحد المجاني. نسبة 70% فأكثر = أبلغ المستخدم. صفر لعدة أيام = اسأل المستخدم إن كانت العيادات تستخدم التطبيق.
   - workflow «تنبيه توقف Firebase» (quota.yml) يعمل كل ساعة: أي فشل فيه = التطبيق توقف عند الناس → أبلغ المستخدم فوراً.
3. فحص الموقع الحقيقي (`.results/live.txt`): nabd.sy (أساسي) وnabdsy.web.app وgithub.io/nabd. أي FAIL = عطل. سطر WARN «زوار دون أي تنزيل»: اطلب من المستخدم تجربة التنزيل من جواله.
4. الفحص المحلي (من مجلد الأدوات الذي يطبعه setup.sh): `python3 dm_t.py sweep.py` (كل صفحات كل الأدوار عربي/إنكليزي، يجب «problems 0» و«no errors») و`python3 dm_t.py flows.py` (عمليات أساسية) و`python3 dm_t.py chkreq.py` (تأكيد طلبات المواعيد وتثبيتها؛ يجب أن تظهر «تم تأكيد الموعد» و«تم الحجز»، وإن كان يوم الطلب مغلقاً يُدخل الوقت يدوياً).
5. إن وُجد أي خطأ أو فشل: حدّد السبب، أصلحه، اختبره، ارفع رقم نسخة sw.js، اعمل commit و push (مع سطور Co-Authored-By/Claude-Session)، وتأكد أن CI والنشر نجحا، ثم أعد تشغيل live.yml. لا تعدّل أي بيانات حقيقية ولا تقرأ بيانات مرضى.
6. أبلغ المستخدم برسالة قصيرة بالعامية السورية إذا وُجد عطل (ما هو، وماذا أصلحت).
6ب. **كل يوم جمعة: مراجعة أمنية**: اقرأ firestore.rules وكل تغيير منذ آخر مراجعة (`git log --since='8 days ago' -p -- '*.js' firestore.rules`)، وابحث عن: إدراج قيم في HTML دون esc()، قواعد أوسع من اللازم، حقول جديدة غير مقيدة، أسرار في المستودع. أصلح فوراً مع اختبار في tests/rules.test.mjs، ثم أبلغ المستخدم بسطر واحد على الأقل. لا تستخدم أدوات هجوم آلية.
7. حذف حسابات العيادات: purge.yml كل ساعة؛ في التقرير اذكر إن وُجدت عيادة «قيد الحذف» (WAIT) أو حُذفت (DONE).
8. أخيراً جدول فحص الغد: send_later في اليوم التالي الساعة 06:30Z بنفس الرسالة (والمسار tests/ops/specs/daily_check_spec.md داخل المستودع).
