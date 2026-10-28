// حذف حساب العيادة: يطلبه صاحب العيادة (منشئها) من الإعدادات، فتُقفل العيادة فوراً لكل الفريق والمرضى،
// وتُحذف نهائياً مع كل بياناتها بعد 30 يوماً. يستطيع صاحب العيادة التراجع خلال المهلة.
import { S, logout } from "./app.js";
import { requestClinicDeletion, cancelClinicDeletion, deletionDate, DELETE_DAYS, audit } from "./fb.js";
import { $, esc, fmtDate, ymd, toast, errMsg, modal, platformMark } from "./ui.js";

const IS_DEMO = /\/demo\//.test(location.pathname);
export const isClinicOwner = () => !!S.user && !!S.clinic?.ownerUid && S.clinic.ownerUid === S.user.uid;
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

// بطاقة في آخر صفحة الإعدادات (تظهر لصاحب العيادة فقط)
export function deletionCard() {
  if (!isClinicOwner()) return "";
  return `<section class="card stack del-zone"><h3>حذف حساب العيادة</h3>
    <p class="muted small">يُقفل حساب العيادة فوراً لكل الفريق والمرضى، ويُحذف نهائياً مع كل بياناته بعد ${DELETE_DAYS} يوماً: المرضى والسجلات الطبية والمواعيد والحسابات وحسابات الدخول. يمكنكم التراجع خلال هذه المدة.</p>
    <button type="button" class="btn danger del-clinic">حذف حساب العيادة</button></section>`;
}

export function bindDeletion() {
  const b = $(".del-clinic");
  if (!b) return;
  b.onclick = async () => {
    const name = norm(S.clinic?.name);
    const until = fmtDate(ymd(deletionDate({ deletion: { at: Date.now() } })), false);
    await modal("حذف حساب العيادة", `<form class="stack">
      <div class="alert danger">⚠️ ستُقفل العيادة الآن لكل الفريق والمرضى، وتُحذف كل بياناتها نهائياً يوم ${esc(until)} ولا يمكن استرجاعها بعد ذلك.</div>
      <p class="small">ننصح بطباعة أو حفظ ما تحتاجونه من السجلات قبل الحذف. يمكن التراجع من هذا الحساب حتى ذلك اليوم.</p>
      <label class="field"><span>للتأكيد اكتبوا اسم العيادة: <b>${esc(name)}</b></span><input name="confirm" autocomplete="off" required></label>
    </form>`, {
      ok: "حذف الحساب", danger: true,
      onOk: async (d) => {
        if (norm(d.confirm) !== name) { toast("اسم العيادة غير مطابق", true); return false; }
        if (IS_DEMO) { toast("الحذف غير متاح في العيادة التجريبية", true); return false; }
        await requestClinicDeletion();
        try { await audit("طلب حذف حساب العيادة"); } catch {}
        location.reload();
      },
    });
  };
}

// شاشة تمنع استخدام العيادة خلال مهلة الحذف (للفريق والمرضى)
export function deletionScreen() {
  const until = fmtDate(ymd(deletionDate(S.clinic)), false);
  const owner = isClinicOwner();
  const app = document.getElementById("app") || document.body;
  app.innerHTML = `<div class="center-page del-page"><div class="card stack center del-screen">
      <div>${platformMark(52)}</div>
      <h2>حساب العيادة قيد الحذف</h2>
      <p>${S.clinic?.deletion?.now ? "سيُحذف حساب العيادة نهائياً خلال ساعة." : `سيُحذف حساب العيادة نهائياً مع كل بياناته يوم <b>${esc(until)}</b>.`}</p>
      ${owner && !S.clinic?.deletion?.now ? `<button class="btn primary block undo">التراجع عن الحذف واستعادة الحساب</button>` : `<p class="muted small">للاستفسار تواصلوا مع إدارة العيادة.</p>`}
      <button class="btn ghost block out">تسجيل الخروج</button>
    </div></div>`;
  $(".out").onclick = () => logout();
  const u = $(".undo");
  if (u) u.onclick = async () => {
    u.disabled = true;
    try { await cancelClinicDeletion(); try { await audit("التراجع عن حذف حساب العيادة"); } catch {} toast("تمت استعادة حساب العيادة"); setTimeout(() => location.reload(), 600); }
    catch (e) { toast(errMsg(e), true); u.disabled = false; }
  };
}
