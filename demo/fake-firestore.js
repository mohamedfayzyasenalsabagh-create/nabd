const KEY = "demo-fs";
function load() { try { const raw = JSON.parse(localStorage.getItem(KEY) || "[]"); return new Map(raw.map(([k, v]) => [k, revive(v)])); } catch { return new Map(); } }
function revive(v) { if (v && typeof v === "object") { if ("__t" in v) return new Timestamp(v.__t); if (Array.isArray(v)) return v.map(revive); const o = {}; for (const k in v) o[k] = revive(v[k]); return o; } return v; }
function persist() { try { localStorage.setItem(KEY, JSON.stringify([...store], (k, v) => (v && typeof v === "object" && "ms" in v && "seconds" in v) ? { __t: v.ms } : v)); } catch {} }
const listeners = new Set();
let store;
const SERVER_TS = { __ts: true };
export class Timestamp { constructor(ms) { this.seconds = Math.floor(ms / 1000); this.nanoseconds = 0; this.ms = ms; } toDate() { return new Date(this.ms); } toMillis() { return this.ms; } static now() { return new Timestamp(Date.now()); } static fromMillis(ms) { return new Timestamp(ms); } }
store = window.__fs = load();
export const serverTimestamp = () => SERVER_TS;
export const arrayUnion = (...v) => ({ __union: v });
export const arrayRemove = (...v) => ({ __remove: v });
export function initializeFirestore() { return { t: "db" }; }
export const persistentLocalCache = () => ({}); export const persistentMultipleTabManager = () => ({});
const rid = () => Math.random().toString(36).slice(2, 12);
export function collection(base, ...segs) { const path = (base.path ? base.path + "/" : "") + segs.join("/"); return { type: "col", path, id: path.split("/").at(-1) }; }
export function doc(base, ...segs) {
  if (base.type === "col" && !segs.length) segs = [rid()];
  const path = (base.path ? base.path + "/" : "") + segs.join("/");
  return { type: "doc", path, id: path.split("/").at(-1) };
}
function resolve(v, old) {
  if (v === SERVER_TS) return Timestamp.now();
  if (v && v.__remove) { const rm = v.__remove.map((x) => JSON.stringify(x)); return (Array.isArray(old) ? old : []).filter((x) => !rm.includes(JSON.stringify(x))); }
  if (v && v.__union) return [...new Set([...(Array.isArray(old) ? old : []), ...v.__union.map((x) => typeof x === "object" ? JSON.stringify(x) : x)])].map((x) => { try { return typeof x === "string" && x.startsWith("{") ? JSON.parse(x) : x; } catch { return x; } });
  if (Array.isArray(v)) return v.map((x) => resolve(x));
  if (v && typeof v === "object" && !(v instanceof Timestamp)) { const o = {}; for (const k in v) o[k] = resolve(v[k]); return o; }
  return v;
}
const snap = (ref) => { const d = store.get(ref.path); return { id: ref.id, ref, exists: () => d !== undefined, data: () => d && structuredCloneSafe(d) }; };
function structuredCloneSafe(d) { const o = {}; for (const k in d) o[k] = d[k]; return o; }
const notify = () => persist() || setTimeout(() => listeners.forEach((l) => l()), 0);
export async function getDoc(ref) { return snap(ref); }
export async function setDoc(ref, data, opt) {
  const old = store.get(ref.path) || {};
  const base = opt?.merge ? { ...old } : {};
  for (const k in data) base[k] = resolve(data[k], old[k]);
  store.set(ref.path, base); notify();
}
export async function updateDoc(ref, data) {
  if (!store.has(ref.path)) { const e = new Error("not-found"); e.code = "not-found"; throw e; }
  const old = store.get(ref.path); const n = { ...old };
  for (const k in data) n[k] = resolve(data[k], old[k]);
  store.set(ref.path, n); notify();
}
export async function addDoc(col, data) { const r = doc(col); await setDoc(r, data); return r; }
export const where = (f, op, v) => ({ f, op, v }); export const orderBy = (f, dir) => ({ ob: f, dir }); export const limit = (n) => ({ lim: n });
export function query(col, ...c) { return { ...col, c }; }
function run(q) {
  const depth = q.path.split("/").length + 1;
  let docs = [...store.keys()].filter((k) => k.startsWith(q.path + "/") && k.split("/").length === depth).map((k) => ({ ref: { type: "doc", path: k, id: k.split("/").at(-1) } }));
  for (const c of q.c || []) {
    if (c.f) docs = docs.filter(({ ref }) => { const x = store.get(ref.path)[c.f]; switch (c.op) { case "==": return x === c.v; case ">=": return x >= c.v; case "<=": return x <= c.v; case ">": return x > c.v; case "<": return x < c.v; case "in": return c.v.includes(x); } });
    if (c.ob) docs.sort((a, b) => { const A = store.get(a.ref.path)[c.ob], B = store.get(b.ref.path)[c.ob]; const av = A?.ms ?? A, bv = B?.ms ?? B; return (av > bv ? 1 : -1) * (c.dir === "desc" ? -1 : 1); });
    if (c.lim) docs = docs.slice(0, c.lim);
  }
  const ds = docs.map(({ ref }) => snap(ref));
  return { docs: ds, size: ds.length };
}
export async function getDocs(q) { return run(q); }
export function onSnapshot(ref, cb) {
  const fire = () => cb(ref.type === "doc" ? snap(ref) : run(ref));
  listeners.add(fire); setTimeout(fire, 0);
  return () => listeners.delete(fire);
}
export async function runTransaction(db, fn) { return fn({ get: getDoc, set: (r, d) => setDoc(r, d), update: (r, d) => updateDoc(r, d) }); }
export function writeBatch() { const ops = []; return { set: (r, d, o) => ops.push(() => setDoc(r, d, o)), update: (r, d) => ops.push(() => updateDoc(r, d)), commit: async () => { for (const o of ops) await o(); } }; }
