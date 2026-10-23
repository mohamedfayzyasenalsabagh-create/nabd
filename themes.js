// الثيمات: مسؤول العيادة يختار ثيم العيادة، وكل مستخدم يستطيع تغييره لنفسه
// الأوراق المطبوعة تبقى دائماً بلون العيادة (هويتها الرسمية)
export const SKINS = [
  { id: "", name: "لون العيادة", desc: "التصميم الأصلي بلون عيادتكم", sw: ["#F5F6F4", "var(--brand-accent,#0E7C7B)", "#ffffff"] },
  { id: "mint", name: "نعناع هادئ", desc: "كريمي دافئ مع الأخضر", accent: "#0d6b66", sw: ["#f7f4ee", "#0d6b66", "#ffd166"] },
  { id: "violet", name: "بنفسجي جريء", desc: "بنفسجي متدرّج", accent: "#4f46e5", sw: ["#f4f2ff", "#4f46e5", "#ff6b6b"] },
  { id: "blue", name: "أزرق طبي", desc: "رسمي يناسب المراكز", accent: "#1f6feb", sw: ["#f3f7fc", "#1f6feb", "#22c55e"] },
  { id: "rose", name: "وردي ناعم", desc: "للنسائية والتجميل والأطفال", accent: "#e84a7f", sw: ["#fff6f7", "#e84a7f", "#a855f7"] },
  { id: "glass", name: "سماوي زجاجي", desc: "عصري وخفيف", accent: "#0891b2", sw: ["#eef9fb", "#0891b2", "#5eead4"] },
  { id: "coral", name: "تركوازي ومرجاني", desc: "أخضر نبض مع لمسة دافئة", accent: "#0d9488", sw: ["#f2fbfa", "#0d9488", "#ff6f61"] },
  { id: "gold", name: "داكن فاخر", desc: "أسود وذهبي (داكن دائماً)", accent: "#d4af37", ink: "#14151a", dark: true, sw: ["#14151a", "#d4af37", "#1f2128"] },
  { id: "neon", name: "ليلي نيون", desc: "كحلي مع نعناعي مضيء (داكن دائماً)", accent: "#2ef2c5", ink: "#0b1020", dark: true, sw: ["#0b1020", "#2ef2c5", "#ff4fd8"] },
];
export const skinById = (id) => SKINS.find((s) => s.id === (id || "")) || SKINS[0];
let brandAccent = "#0E7C7B", current = "";
// يُستدعى من applyBrand بلون العيادة، ومن applySkin عند تغيير الثيم
export function paintAccent(accent) {
  if (accent) brandAccent = accent;
  const r = document.documentElement, s = skinById(current);
  r.style.setProperty("--brand-accent", brandAccent);
  r.style.setProperty("--accent", s.accent || brandAccent);
  if (s.ink) r.style.setProperty("--accent-ink", s.ink); else r.style.removeProperty("--accent-ink");
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = s.dark ? s.sw[0] : (s.accent || brandAccent);
}
// عرض مؤقت دون حفظ (الصفحات العامة تبقى بتصميم نبض)
export function viewSkin(id) {
  current = skinById(id).id;
  const r = document.documentElement;
  if (current) r.dataset.skin = current; else delete r.dataset.skin;
  paintAccent();
}
export function applySkin(id) {
  current = skinById(id).id;
  const r = document.documentElement;
  if (current) r.dataset.skin = current; else delete r.dataset.skin;
  try { localStorage.setItem("skin", current); } catch {}
  paintAccent();
}
export const currentSkin = () => current;
