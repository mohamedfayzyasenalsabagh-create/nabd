import { test } from "node:test";
import assert from "node:assert";
import { dateInTz, clinicActive, intlPhone, reminderText, dueReminders } from "./logic.js";
test("التاريخ بتوقيت دمشق", () => {
  assert.equal(dateInTz(new Date("2026-09-30T22:30:00Z"), "Asia/Damascus"), "2026-10-01");
  assert.equal(dateInTz(new Date("2026-09-30T10:00:00Z"), "Asia/Damascus", 1), "2026-10-01");
});
test("حالة الاشتراك", () => {
  assert.equal(clinicActive({ status: "active", expiresAt: { toMillis: () => Date.now() + 1e6 } }), true);
  assert.equal(clinicActive({ status: "active", expiresAt: { toMillis: () => Date.now() - 1 } }), false);
  assert.equal(clinicActive({ status: "suspended", expiresAt: { toMillis: () => Date.now() + 1e6 } }), false);
});
test("صيغة الرقم الدولية", () => {
  assert.equal(intlPhone("0944 555 666"), "963944555666");
  assert.equal(intlPhone("00963944555666"), "963944555666");
});
test("نص التذكير والمواعيد المستحقة", () => {
  const t = reminderText({ patientName: "أحمد", time: "16:20" }, { name: "عيادة سارة", address: "المزة" });
  assert.match(t, /أحمد/); assert.match(t, /4:20 م/); assert.match(t, /المزة/);
  const due = dueReminders([{ status: "confirmed", phone: "09" }, { status: "cancelled", phone: "09" }, { status: "confirmed", phone: "09", reminded: true }, { status: "confirmed" }]);
  assert.equal(due.length, 1);
});
