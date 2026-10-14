// تقرير يومي بأعطال التطبيق خلال آخر 24 ساعة (رسائل الأخطاء ومكانها فقط، دون بيانات مرضى)
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fs from "node:fs";
initializeApp({ credential: cert(JSON.parse(process.env.SA)) });
const db = getFirestore();
const since = Timestamp.fromMillis(Date.now() - 864e5);
const snap = await db.collection("errors").where("at", ">=", since).get();
const g = {};
snap.docs.forEach((d) => { const e = d.data(); const k = e.msg; (g[k] ||= { n: 0, routes: new Set(), roles: new Set(), stack: e.stack, ua: e.ua }); g[k].n++; g[k].routes.add(e.route); g[k].roles.add(e.role); });
const out = Object.entries(g).sort((a, b) => b[1].n - a[1].n)
  .map(([m, x]) => `${x.n}x | ${m} | ${[...x.routes].join(",")} | ${[...x.roles].join(",")}\n   ${String(x.stack).split("\n").slice(0, 4).join("\n   ")}\n   ${x.ua}`).join("\n\n");
fs.mkdirSync(".results", { recursive: true });
fs.writeFileSync(".results/errors.txt", `أعطال آخر 24 ساعة: ${snap.size}\n\n${out}\n`);
console.log(`errors in last 24h: ${snap.size}`);
