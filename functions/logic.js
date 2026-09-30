// منطق خالص قابل للاختبار دون Firebase
export function dateInTz(d = new Date(), tz = "Asia/Damascus", addDays = 0) {
  const x = new Date(d.getTime() + addDays * 864e5);
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(x);
  const g = (t) => p.find((q) => q.type === t).value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}
export function clinicActive(c, now = Date.now()) {
  const ms = c?.expiresAt?.toMillis ? c.expiresAt.toMillis() : c?.expiresAt?._seconds ? c.expiresAt._seconds * 1000 : 0;
  return ["trial", "active"].includes(c?.status) && ms > now;
}
export function intlPhone(p) {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "963" + d.slice(1);
  return d;
}
function time12(t) {
  const [h, m] = String(t).split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "م" : "ص"}`;
}
export function reminderText(a, c) {
  return `مرحباً ${a.patientName}، نذكّرك بموعدك غداً في ${c.name} الساعة ${time12(a.time)}.${c.address ? " العنوان: " + c.address : ""} للإلغاء أو التعديل تواصل مع العيادة.`;
}
export function dueReminders(appts) {
  return appts.filter((a) => a.status === "confirmed" && !a.reminded && a.phone);
}
