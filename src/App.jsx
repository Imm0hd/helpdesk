import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ── NWA Brand ─────────────────────────────────────────────────
const BRAND = {
  nameEn: "National Water Alliance",
  nameAr: "التحالف الوطني للمياه",
  shortEn: "NWA",
  shortAr: "نواة",
  taglineEn: "IT Support Portal",
  taglineAr: "بوابة الدعم التقني",
  primary: "#1a5fa8",
  primaryDark: "#0d3d6e",
  primaryLight: "#e8f1fb",
  green: "#5a9e3f",
  navy: "#0d2137",
};

const CATEGORIES_EN = ["Hardware", "Software", "Network", "Access & Permissions", "Other"];
const CATEGORIES_AR = ["أجهزة", "برمجيات", "شبكة", "الصلاحيات والوصول", "أخرى"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const PRIORITIES_AR = ["منخفض", "متوسط", "عالي", "حرج"];
const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];
const STATUSES_AR = ["مفتوح", "قيد المعالجة", "محلول", "مغلق"];
const AGENTS = ["Unassigned", "Ahmed Al-Rashidi", "Sara Khalil", "Omar Mahmoud"];

const PRIORITY_COLOR = { Low: "#16a34a", Medium: "#d97706", High: "#ea580c", Critical: "#dc2626" };
const STATUS_COLOR = { Open: "#1a5fa8", "In Progress": "#7c3aed", Resolved: "#16a34a", Closed: "#64748b" };

function genId(list) {
  const max = Math.max(...list.map(t => parseInt(t.id.replace("TK-", ""))), 0);
  return `TK-${String(max + 1).padStart(3, "0")}`;
}

// ── Components ────────────────────────────────────────────────
function Badge({ label, color }) {
  return (
    <span style={{
      background: color + "18",
      color,
      border: `1px solid ${color}30`,
      borderRadius: 5,
      padding: "3px 10px",
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: 0.2,
    }}>{label}</span>
  );
}

function Toast({ msg, color }) {
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 9999,
      background: color || BRAND.primary,
      color: "#fff", padding: "12px 20px", borderRadius: 8,
      fontWeight: 600, fontSize: 14,
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      display: "flex", alignItems: "center", gap: 8,
    }}>{msg}</div>
  );
}

function Spinner({ dark }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", gap: 12, flexDirection: "column" }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${dark ? "#e2e8f0" : "#1e293b"}`, borderTop: `3px solid ${BRAND.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: dark ? "#94a3b8" : "#64748b", fontSize: 14 }}>Loading...</div>
    </div>
  );
}

function Modal({ title, onClose, dark, children }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" }}>
      <div style={{
        background: dark ? "#1e293b" : "#fff",
        borderRadius: 16, width: "min(95vw,640px)", maxHeight: "90vh", overflow: "auto",
        padding: 32, boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
        border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: dark ? "#f1f5f9" : "#0f172a", fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const SAMPLE = [
  { id: "TK-001", title: "Laptop won't boot", category: "Hardware", priority: "Critical", status: "Open", agent: "Ahmed Al-Rashidi", created: "2026-05-10", email: "john@nwa.com", description: "Black screen on startup after Windows update.", comments: [] },
  { id: "TK-002", title: "VPN keeps dropping", category: "Network", priority: "High", status: "In Progress", agent: "Omar Mahmoud", created: "2026-05-11", email: "sara@nwa.com", description: "VPN drops every 20 minutes for remote users.", comments: [] },
  { id: "TK-003", title: "Reset email password", category: "Access & Permissions", priority: "Medium", status: "Resolved", agent: "Sara Khalil", created: "2026-05-09", email: "mike@nwa.com", description: "User locked out of email account.", comments: [] },
  { id: "TK-004", title: "Printer not detected", category: "Hardware", priority: "Low", status: "Open", agent: "Unassigned", created: "2026-05-12", email: "lena@nwa.com", description: "Network printer not showing on Windows 11.", comments: [] },
  { id: "TK-005", title: "Excel crashes on open", category: "Software", priority: "Medium", status: "Open", agent: "Ahmed Al-Rashidi", created: "2026-05-12", email: "tom@nwa.com", description: "Excel crashes immediately after launching.", comments: [] },
];

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("All");
  const [fPriority, setFPriority] = useState("All");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [dark, setDark] = useState(true);
  const [lang, setLang] = useState("en");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [form, setForm] = useState({
    title: "", email: "", category: CATEGORIES_EN[0], priority: "Medium", description: ""
  });

  const t = (en, ar) => lang === "ar" ? ar : en;
  const isAr = lang === "ar";

  const bg = dark ? "#0f172a" : "#f8fafc";
  const surface = dark ? "#1e293b" : "#ffffff";
  const border = dark ? "#334155" : "#e2e8f0";
  const text = dark ? "#f1f5f9" : "#0f172a";
  const muted = dark ? "#94a3b8" : "#64748b";
  const inputBg = dark ? "#0f172a" : "#f8fafc";

  const inputStyle = {
    width: "100%", background: inputBg, border: `1px solid ${border}`,
    borderRadius: 8, padding: "10px 14px", color: text, fontSize: 14,
    outline: "none", boxSizing: "border-box", marginBottom: 14,
    fontFamily: "inherit", transition: "border 0.2s",
  };
  const labelStyle = {
    display: "block", marginBottom: 5, fontSize: 12,
    color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
  };

  function notify(msg, color) { setToast({ msg, color }); setTimeout(() => setToast(null), 3500); }

  useEffect(() => {
  // Load tickets on startup
  fetchTickets();

  // Listen for ANY changes to the tickets table in real time
  const channel = supabase
    .channel("tickets-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tickets" },
      (payload) => {
        // New ticket added
        if (payload.eventType === "INSERT") {
          setTickets(prev => [payload.new, ...prev]);
        }
        // Ticket updated (status, agent, comment)
        if (payload.eventType === "UPDATE") {
          setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
        }
        // Ticket deleted
        if (payload.eventType === "DELETE") {
          setTickets(prev => prev.filter(t => t.id !== payload.old.id));
        }
      }
    )
    .subscribe();

  // Cleanup when app closes
  return () => supabase.removeChannel(channel);
}, []);

  async function fetchTickets() {
    setLoading(true);
    const { data, error } = await supabase.from("tickets").select("*").order("created", { ascending: false });
    if (error) { setTickets(SAMPLE); }
    else setTickets(data?.length ? data : SAMPLE);
    setLoading(false);
  }

  async function submitTicket() {
    if (!form.title.trim() || !form.email.trim()) return notify(t("Title and email required.", "العنوان والبريد الإلكتروني مطلوبان."), "#d97706");
    setSaving(true);
    const tk = { ...form, id: genId(tickets), status: "Open", agent: "Unassigned", created: new Date().toISOString().slice(0, 10), comments: [] };
    const { error } = await supabase.from("tickets").insert([tk]);
    if (error) notify(t("Error creating ticket.", "خطأ في إنشاء التذكرة."), "#dc2626");
    else {
      setTickets(p => [tk, ...p]);
      setForm({ title: "", email: "", category: CATEGORIES_EN[0], priority: "Medium", description: "" });
      setShowNew(false);
      notify(`✅ ${tk.id} ${t("created", "تم إنشاؤها")}`);
    }
    setSaving(false);
  }

  async function updateTicket(id, changes) {
    const { error } = await supabase.from("tickets").update(changes).eq("id", id);
    if (!error) {
      setTickets(p => p.map(t => t.id === id ? { ...t, ...changes } : t));
      setSelected(p => p ? { ...p, ...changes } : p);
    }
  }

  async function postComment() {
    if (!comment.trim() || !selected) return;
    const c = { text: comment, by: "Agent", at: new Date().toLocaleString() };
    await updateTicket(selected.id, { comments: [...(selected.comments || []), c] });
    setComment("");
    notify(t("Comment added", "تمت إضافة التعليق"));
  }

  const filtered = tickets.filter(t =>
    (fStatus === "All" || t.status === fStatus) &&
    (fPriority === "All" || t.priority === fPriority) &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search))
  );

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "Open").length,
    inProgress: tickets.filter(t => t.status === "In Progress").length,
    critical: tickets.filter(t => t.priority === "Critical").length,
    resolved: tickets.filter(t => t.status === "Resolved").length,
  };

  const NAV = [
    { id: "dashboard", en: "Dashboard", ar: "لوحة التحكم", icon: "⊞" },
    { id: "tickets", en: "All Tickets", ar: "جميع التذاكر", icon: "☰" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Tajawal:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${bg}; color: ${text}; font-family: ${isAr ? "'Tajawal'" : "'Inter'"}, sans-serif; direction: ${isAr ? "rtl" : "ltr"}; transition: background 0.2s, color 0.2s; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: ${border}; border-radius: 4px; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        .nav-item:hover { background: ${dark ? "rgba(255,255,255,0.06)" : "rgba(26,95,168,0.08)"} !important; }
        .row-hover:hover { background: ${dark ? "#253347" : "#f1f5f9"} !important; cursor: pointer; }
        .btn-ghost:hover { background: ${border} !important; }
        select option { background: ${surface}; color: ${text}; }
      `}</style>

      {toast && <Toast msg={toast.msg} color={toast.color} />}

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", direction: isAr ? "rtl" : "ltr" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{
          width: sidebarOpen ? 260 : 72, background: dark ? "#0d2137" : BRAND.primary,
          display: "flex", flexDirection: "column", flexShrink: 0,
          transition: "width 0.25s ease", overflow: "hidden",
          boxShadow: "2px 0 12px rgba(0,0,0,0.15)",
        }}>
          {/* Logo */}
          <div style={{ padding: "20px 16px", borderBottom: `1px solid rgba(255,255,255,0.1)`, display: "flex", alignItems: "center", gap: 12, minHeight: 72 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              <img src="/nwa-logo.png" alt="NWA" style={{ width: 36, height: 36, objectFit: "contain" }} />
            </div>
            {sidebarOpen && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
                  {isAr ? BRAND.shortAr : BRAND.shortEn}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                  {isAr ? BRAND.taglineAr : BRAND.taglineEn}
                </div>
              </div>
            )}
            <button onClick={() => setSidebarOpen(p => !p)} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14 }}>
              {sidebarOpen ? "←" : "→"}
            </button>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px 10px" }}>
            {NAV.map(n => (
              <button key={n.id} className="nav-item" onClick={() => setPage(n.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                background: page === n.id ? "rgba(255,255,255,0.15)" : "transparent",
                color: page === n.id ? "#fff" : "rgba(255,255,255,0.65)",
                fontWeight: page === n.id ? 600 : 400,
                fontSize: 14, border: "none", cursor: "pointer",
                transition: "all 0.15s", fontFamily: "inherit",
                justifyContent: sidebarOpen ? "flex-start" : "center",
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
                {sidebarOpen && <span>{isAr ? n.ar : n.en}</span>}
              </button>
            ))}
          </nav>

          {/* New Ticket */}
          {sidebarOpen && (
            <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button onClick={() => setShowNew(true)} style={{
                width: "100%", padding: "11px 0", border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14,
                color: "#fff", background: "rgba(255,255,255,0.1)",
                transition: "all 0.2s", fontFamily: "inherit",
              }}>+ {isAr ? "تذكرة جديدة" : "New Ticket"}</button>
            </div>
          )}
        </aside>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Top bar */}
          <header style={{ height: 64, background: surface, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", padding: "0 28px", gap: 16, flexShrink: 0, boxShadow: dark ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: text }}>
                {page === "dashboard" ? t("Dashboard", "لوحة التحكم") : t("All Tickets", "جميع التذاكر")}
              </h1>
              <p style={{ fontSize: 12, color: muted, marginTop: 1 }}>
                {isAr ? BRAND.nameAr : BRAND.nameEn} — {isAr ? BRAND.taglineAr : BRAND.taglineEn}
              </p>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Language toggle */}
              <button onClick={() => setLang(l => l === "en" ? "ar" : "en")} style={{
                padding: "6px 14px", borderRadius: 6, border: `1px solid ${border}`,
                background: surface, color: text, cursor: "pointer", fontSize: 13,
                fontWeight: 600, fontFamily: "inherit",
              }}>{lang === "en" ? "عربي" : "English"}</button>

              {/* Theme toggle */}
              <button onClick={() => setDark(d => !d)} style={{
                width: 36, height: 36, borderRadius: 8, border: `1px solid ${border}`,
                background: surface, color: text, cursor: "pointer", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{dark ? "☀️" : "🌙"}</button>

              {/* New ticket */}
              <button onClick={() => setShowNew(true)} style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: BRAND.primary, color: "#fff", cursor: "pointer",
                fontWeight: 600, fontSize: 14, fontFamily: "inherit",
              }}>+ {isAr ? "تذكرة جديدة" : "New Ticket"}</button>
            </div>
          </header>

          {/* Content */}
          <main style={{ flex: 1, overflow: "auto", background: bg, padding: "28px 32px" }}>

            {/* DASHBOARD */}
            {page === "dashboard" && (
              <div style={{ animation: "fadeIn 0.3s ease" }}>
                {loading ? <Spinner dark={dark} /> : (
                  <>
                    {/* Stat Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
                      {[
                        { label: t("Total Tickets", "إجمالي التذاكر"), value: stats.total, color: BRAND.primary, icon: "🎫" },
                        { label: t("Open", "مفتوح"), value: stats.open, color: "#1a5fa8", icon: "📬" },
                        { label: t("In Progress", "قيد المعالجة"), value: stats.inProgress, color: "#7c3aed", icon: "⚙️" },
                        { label: t("Critical", "حرج"), value: stats.critical, color: "#dc2626", icon: "🔴" },
                        { label: t("Resolved", "محلول"), value: stats.resolved, color: "#16a34a", icon: "✅" },
                      ].map(s => (
                        <div key={s.label} style={{
                          background: surface, borderRadius: 12, padding: "20px",
                          border: `1px solid ${border}`,
                          borderTop: `3px solid ${s.color}`,
                          boxShadow: dark ? "none" : "0 1px 6px rgba(0,0,0,0.06)",
                        }}>
                          <div style={{ fontSize: 24, marginBottom: 10 }}>{s.icon}</div>
                          <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                          <div style={{ fontSize: 12, color: muted, marginTop: 5, fontWeight: 500 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Charts Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 20 }}>
                      {/* Priority */}
                      <div style={{ background: surface, borderRadius: 12, padding: 24, border: `1px solid ${border}`, boxShadow: dark ? "none" : "0 1px 6px rgba(0,0,0,0.06)" }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 20 }}>{t("Priority Breakdown", "توزيع الأولوية")}</h3>
                        {PRIORITIES.map((p, i) => {
                          const c = tickets.filter(t => t.priority === p).length;
                          const pct = tickets.length ? Math.round(c / tickets.length * 100) : 0;
                          return (
                            <div key={p} style={{ marginBottom: 14 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                                <span style={{ color: text, fontWeight: 500 }}>{isAr ? PRIORITIES_AR[i] : p}</span>
                                <span style={{ color: PRIORITY_COLOR[p], fontWeight: 700 }}>{c}</span>
                              </div>
                              <div style={{ background: dark ? "#0f172a" : "#f1f5f9", borderRadius: 4, height: 6, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: PRIORITY_COLOR[p], borderRadius: 4, transition: "width 0.6s" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Status */}
                      <div style={{ background: surface, borderRadius: 12, padding: 24, border: `1px solid ${border}`, boxShadow: dark ? "none" : "0 1px 6px rgba(0,0,0,0.06)" }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 20 }}>{t("Status Overview", "نظرة عامة على الحالة")}</h3>
                        {STATUSES.map((s, i) => {
                          const c = tickets.filter(t => t.status === s).length;
                          const pct = tickets.length ? Math.round(c / tickets.length * 100) : 0;
                          return (
                            <div key={s} style={{ marginBottom: 14 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                                <span style={{ color: text, fontWeight: 500 }}>{isAr ? STATUSES_AR[i] : s}</span>
                                <span style={{ color: STATUS_COLOR[s], fontWeight: 700 }}>{c}</span>
                              </div>
                              <div style={{ background: dark ? "#0f172a" : "#f1f5f9", borderRadius: 4, height: 6, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: STATUS_COLOR[s], borderRadius: 4, transition: "width 0.6s" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Recent */}
                      <div style={{ background: surface, borderRadius: 12, padding: 24, border: `1px solid ${border}`, boxShadow: dark ? "none" : "0 1px 6px rgba(0,0,0,0.06)" }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 20 }}>{t("Recent Tickets", "أحدث التذاكر")}</h3>
                        {tickets.slice(0, 6).map(t => (
                          <div key={t.id} onClick={() => { setSelected(t); setPage("tickets"); }}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${border}`, cursor: "pointer" }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{t.title}</div>
                              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{t.id} · {t.created}</div>
                            </div>
                            <Badge label={t.status} color={STATUS_COLOR[t.status]} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TICKETS TABLE */}
            {page === "tickets" && (
              <div style={{ animation: "fadeIn 0.3s ease" }}>
                {/* Filters */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
                  <input placeholder={t("Search tickets...", "البحث في التذاكر...")} value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 200, background: surface, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 14px", color: text, fontSize: 14, outline: "none", fontFamily: "inherit" }} />
                  <select value={fStatus} onChange={e => setFStatus(e.target.value)}
                    style={{ background: surface, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 14px", color: text, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                    <option value="All">{t("All Status", "جميع الحالات")}</option>
                    {STATUSES.map((s, i) => <option key={s} value={s}>{isAr ? STATUSES_AR[i] : s}</option>)}
                  </select>
                  <select value={fPriority} onChange={e => setFPriority(e.target.value)}
                    style={{ background: surface, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 14px", color: text, fontSize: 13, outline: "none", fontFamily: "inherit" }}>
                    <option value="All">{t("All Priority", "جميع الأولويات")}</option>
                    {PRIORITIES.map((p, i) => <option key={p} value={p}>{isAr ? PRIORITIES_AR[i] : p}</option>)}
                  </select>
                  <button onClick={fetchTickets} style={{ padding: "9px 16px", background: surface, border: `1px solid ${border}`, borderRadius: 8, color: muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                    🔄 {t("Refresh", "تحديث")}
                  </button>
                </div>

                <div style={{ fontSize: 13, color: muted, marginBottom: 14 }}>
                  {filtered.length} {t("tickets found", "تذكرة تم العثور عليها")}
                </div>

                {loading ? <Spinner dark={dark} /> : (
                  <div style={{ background: surface, borderRadius: 12, overflow: "hidden", border: `1px solid ${border}`, boxShadow: dark ? "none" : "0 1px 6px rgba(0,0,0,0.06)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: dark ? "#162032" : "#f8fafc" }}>
                          {[
                            t("ID", "الرقم"),
                            t("Title", "العنوان"),
                            t("Category", "الفئة"),
                            t("Priority", "الأولوية"),
                            t("Status", "الحالة"),
                            t("Agent", "الموظف"),
                            t("Created", "تاريخ الإنشاء"),
                          ].map(h => (
                            <th key={h} style={{ padding: "12px 16px", textAlign: isAr ? "right" : "left", fontSize: 11, color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, borderBottom: `1px solid ${border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(t => (
                          <tr key={t.id} className="row-hover" onClick={() => setSelected(t)}
                            style={{ borderTop: `1px solid ${border}`, transition: "background 0.1s" }}>
                            <td style={{ padding: "13px 16px", color: BRAND.primary, fontWeight: 700, fontSize: 13 }}>{t.id}</td>
                            <td style={{ padding: "13px 16px", fontSize: 14, color: text, fontWeight: 500 }}>{t.title}</td>
                            <td style={{ padding: "13px 16px", fontSize: 13, color: muted }}>{t.category}</td>
                            <td style={{ padding: "13px 16px" }}><Badge label={t.priority} color={PRIORITY_COLOR[t.priority]} /></td>
                            <td style={{ padding: "13px 16px" }}><Badge label={t.status} color={STATUS_COLOR[t.status]} /></td>
                            <td style={{ padding: "13px 16px", fontSize: 13, color: muted }}>{t.agent}</td>
                            <td style={{ padding: "13px 16px", fontSize: 13, color: muted }}>{t.created}</td>
                          </tr>
                        ))}
                        {filtered.length === 0 && (
                          <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: muted, fontSize: 14 }}>
                            {t("No tickets found", "لا توجد تذاكر")}
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* NEW TICKET MODAL */}
      {showNew && (
        <Modal title={t("Create New Ticket", "إنشاء تذكرة جديدة")} onClose={() => setShowNew(false)} dark={dark}>
          <label style={labelStyle}>{t("Issue Title *", "عنوان المشكلة *")}</label>
          <input style={inputStyle} placeholder={t("Brief description", "وصف مختصر")} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

          <label style={labelStyle}>{t("Requester Email *", "البريد الإلكتروني *")}</label>
          <input style={inputStyle} type="email" placeholder="user@nwa.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>{t("Category", "الفئة")}</label>
              <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES_EN.map((c, i) => <option key={c} value={c}>{isAr ? CATEGORIES_AR[i] : c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t("Priority", "الأولوية")}</label>
              <select style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map((p, i) => <option key={p} value={p}>{isAr ? PRIORITIES_AR[i] : p}</option>)}
              </select>
            </div>
          </div>

          <label style={labelStyle}>{t("Description", "الوصف")}</label>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} placeholder={t("Describe the issue...", "اوصف المشكلة...")} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-ghost" onClick={() => setShowNew(false)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: muted, cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: "inherit", transition: "background 0.15s" }}>
              {t("Cancel", "إلغاء")}
            </button>
            <button onClick={submitTicket} disabled={saving} style={{ padding: "10px 24px", border: "none", borderRadius: 8, color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14, background: BRAND.primary, opacity: saving ? 0.7 : 1, fontFamily: "inherit" }}>
              {saving ? t("Saving...", "جارٍ الحفظ...") : t("Submit Ticket", "إرسال التذكرة")}
            </button>
          </div>
        </Modal>
      )}

      {/* TICKET DETAIL MODAL */}
      {selected && (
        <Modal title={`${selected.id} — ${selected.title}`} onClose={() => setSelected(null)} dark={dark}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Badge label={selected.priority} color={PRIORITY_COLOR[selected.priority]} />
            <Badge label={selected.status} color={STATUS_COLOR[selected.status]} />
            <Badge label={selected.category} color={muted} />
          </div>

          <div style={{ background: dark ? "#0f172a" : "#f8fafc", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 14, color: dark ? "#94a3b8" : "#475569", lineHeight: 1.7, border: `1px solid ${border}` }}>
            {selected.description || t("No description provided.", "لا يوجد وصف.")}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>{t("Change Status", "تغيير الحالة")}</label>
              <select style={inputStyle} value={selected.status} onChange={e => updateTicket(selected.id, { status: e.target.value })}>
                {STATUSES.map((s, i) => <option key={s} value={s}>{isAr ? STATUSES_AR[i] : s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t("Assign Agent", "تعيين موظف")}</label>
              <select style={inputStyle} value={selected.agent} onChange={e => updateTicket(selected.id, { agent: e.target.value })}>
                {AGENTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div style={{ fontSize: 12, color: muted, marginBottom: 18 }}>
            📧 {selected.email} · 📅 {selected.created}
          </div>

          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 16 }}>
            <div style={{ fontSize: 12, color: muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
              {t("Comments", "التعليقات")} ({selected.comments?.length || 0})
            </div>
            {selected.comments?.map((c, i) => (
              <div key={i} style={{ background: dark ? "#0f172a" : "#f8fafc", borderRadius: 8, padding: "10px 14px", marginBottom: 8, fontSize: 13, border: `1px solid ${border}` }}>
                <span style={{ color: BRAND.primary, fontWeight: 600 }}>{c.by}</span>
                <span style={{ color: muted }}> · {c.at}</span>
                <div style={{ color: dark ? "#cbd5e1" : "#374151", marginTop: 4 }}>{c.text}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && postComment()}
                placeholder={t("Add a comment...", "أضف تعليقاً...")}
                style={{ flex: 1, background: dark ? "#0f172a" : "#f8fafc", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 14px", color: text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              <button onClick={postComment} style={{ padding: "9px 18px", background: BRAND.primary, border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                {t("Post", "نشر")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}