// استهلاك Firestore خلال آخر 24 ساعة مقارنة بحدود الخطة المجانية (أرقام فقط)
import { cert } from "firebase-admin/app";
import fs from "node:fs";
const sa = JSON.parse(process.env.SA);
const tok = (await cert(sa).getAccessToken()).access_token;
const P = sa.project_id;
const LIM = { read: 50000, write: 20000, delete: 20000 };
const end = new Date(), start = new Date(end - 864e5);
const out = [];
let worst = 0;
for (const k of ["read", "write", "delete"]) {
  const q = new URLSearchParams({
    filter: `metric.type="firestore.googleapis.com/document/${k}_count"`,
    "interval.startTime": start.toISOString(), "interval.endTime": end.toISOString(),
    "aggregation.alignmentPeriod": "86400s", "aggregation.perSeriesAligner": "ALIGN_SUM", "aggregation.crossSeriesReducer": "REDUCE_SUM",
  });
  const r = await fetch(`https://monitoring.googleapis.com/v3/projects/${P}/timeSeries?${q}`, { headers: { Authorization: `Bearer ${tok}` } });
  const j = await r.json();
  if (!r.ok) { out.push(`ERROR | ${k}: ${r.status} ${j.error?.message || ""}`); continue; }
  const n = (j.timeSeries || []).flatMap((s) => s.points || []).reduce((s, p) => s + Number(p.value.int64Value || 0), 0);
  const pct = Math.round((n / LIM[k]) * 100); worst = Math.max(worst, pct);
  out.push(`${pct >= 70 ? "WARN" : "OK"} | ${k}: ${n} من ${LIM[k]} يومياً (${pct}%)`);
}
fs.mkdirSync(".results", { recursive: true });
fs.writeFileSync(".results/usage.txt", `استهلاك Firestore آخر 24 ساعة (الحد المجاني يتجدد يومياً)\n${out.join("\n")}\nأعلى نسبة: ${worst}%\n`);
console.log(out.join("\n"));
