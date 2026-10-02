const LS = { get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const users = (window.__fbUsers = window.__fbUsers || LS.get("demo-users") || {});
const saveUsers = () => LS.set("demo-users", users);
const auths = {};
function err(code) { const e = new Error(code); e.code = code; return e; }
export function getAuth(app) {
  if (!auths[app.name]) auths[app.name] = { app, currentUser: null, cbs: [] };
  if (app.name === "[DEFAULT]") { window.__auth = auths[app.name]; const cu = LS.get("demo-auth"); const u = cu && Object.values(users).find((x) => x.uid === cu); if (u) auths[app.name].currentUser = { uid: u.uid, email: u.email, delete: async () => {} }; }
  return auths[app.name];
}
const emit = (a) => { if (a.app.name === "[DEFAULT]") LS.set("demo-auth", a.currentUser ? a.currentUser.uid : null); saveUsers(); a.cbs.forEach((cb) => setTimeout(() => cb(a.currentUser), 0)); };
const _old = (a) => a.cbs.forEach((cb) => setTimeout(() => cb(a.currentUser), 0));
const mkUser = (a, u) => ({ uid: u.uid, email: u.email, delete: async () => {} });
export async function signInWithEmailAndPassword(a, email, pw) {
  const u = users[email];
  if (!u || u.pw !== pw) throw err("auth/invalid-credential");
  a.currentUser = mkUser(a, u); emit(a); return { user: a.currentUser };
}
export async function createUserWithEmailAndPassword(a, email, pw) {
  if (users[email]) throw err("auth/email-already-in-use");
  if (pw.length < 6) throw err("auth/weak-password");
  const u = { uid: "u" + Math.random().toString(36).slice(2, 10), email, pw };
  users[email] = u; a.currentUser = mkUser(a, u); emit(a); return { user: a.currentUser };
}
export async function signOut(a) { a.currentUser = null; emit(a); }
export function onAuthStateChanged(a, cb) { a.cbs.push(cb); setTimeout(() => cb(a.currentUser), 0); return () => {}; }
export async function updatePassword(user, pw) { const u = Object.values(users).find((x) => x.uid === user.uid); u.pw = pw; saveUsers(); }
export async function sendPasswordResetEmail() {}
export async function setPersistence() {}
export const inMemoryPersistence = {};
