import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ============================================================
// CUSTOMIZE YOUR BRAND HERE
// ============================================================
const BRAND = {
  name: "HelpDesk Pro",
  logoText: "HD",
  primaryColor: "#0ea5e9",
  accentColor: "#f59e0b",
  tagline: "IT Support Portal",
};
// ============================================================

const CATEGORIES = ["Hardware", "Software", "Network", "Access & Permissions", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const STATUSES   = ["Open", "In Progress", "Resolved", "Closed"];
const AGENTS     = ["Unassigned", "Alice Mahmood", "Omar Al-Rashidi", "Sara Khalil"];

const PRIORITY_COLOR = { Low: "#22c55e", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444" };
const STATUS_COLOR   = { Open: "#0ea5e9", "In Progress": "#a855f7", Resolved: "#22c55e", Closed: "#64748b" };

function genId(list) {
  const max = Math.max(...list.map(t => parseInt(t.id.replace("TK-", ""))), 0);
  return `TK-${String(max + 1).padStart(3, "0")}`;
}

function Badge({ label, color }) {
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
      {label}
    </span>
  );
}

function Toast({ msg, color }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: color || "#0ea5e9", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 24px #0006" }}>
      {msg}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #1e293b", borderTop: "3px solid #0ea5e9", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#475569", fontSize: 14 }}>Loading tickets...</div>
    </div>
  );
}

const inputStyle = { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#f1f5f9", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 14 };
const labelStyle = { display: "block", marginBottom: 5, fontSize: 12, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 };

function Modal({ title, onClose, children }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1e293b", borderRadius: 18, width: "min(95vw,640px)", maxHeight: "90vh", overflow: "auto", padding: 32, boxShadow: "0 24px 64px #000a", border: "1px solid #334155" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#f1f5f9", fontWeight: 800 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [tickets, setTickets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState("dashboard");
  const [selected, setSelected]   = useState(null);
  const [showNew, setShowNew]     = useState(false);
  const [toast, setToast]         = useState(null);
  const [search, setSearch]       = useState("");
  const [fStatus, setFStatus]     = useState("All");
  const [fPriority, setFPriority] = useState("All");
  const [comment, setComment]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({ title: "", email: "", category: CATEGORIES[0], priority: "Medium", description: "" });

  function notify(msg, color) { setToast({ msg, color }); setTimeout(() => setToast(null), 3500); }

  useEffect(() => { fetchTickets(); }, []);

  async function fetchTickets() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created", { ascending: false });
    if (error) notify("Failed to load: " + error.message, "#ef4444");
    else setTickets(data);
    setLoading(false);
  }

  async function submitTicket() {
    if (!form.title.trim() || !form.email.trim()) return notify("Title and email required.", "#f59e0b");
    setSaving(true);
    const t = { ...form, id: genId(tickets), status: "Open", agent: "Unassigned", created: new Date().toISOString().slice(0,10), comments: [] };
    const { error } = await supabase.from("tickets").insert([t]);
    if (error) notify("Error: " + error.message, "#ef4444");
    else {
      setTickets(p => [t, ...p]);
      setForm({ title: "", email: "", category: CATEGORIES[0], priority: "Medium", description: "" });
      setShowNew(false);
      fetch("/api/send-confirmation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    to: t.email,
    ticketId: t.id,
    title: t.title,
    priority: t.priority,
    category: t.category,
  }),
});
notify(`✅ ${t.id} created! Confirmation sent to ${t.email}`);
    }
    setSaving(false);
  }

  async function updateTicket(id, changes) {
    const { error } = await supabase.from("tickets").update(changes).eq("id", id);
    if (error) notify("Update failed: " + error.message, "#ef4444");
    else {
      setTickets(p => p.map(t => t.id === id ? { ...t, ...changes } : t));
      setSelected(p => p ? { ...p, ...changes } : p);
    }
  }

  async function postComment() {
    if (!comment.trim() || !selected) return;
    const c = { text: comment, by: "Agent", at: new Date().toLocaleString() };
    await updateTicket(selected.id, { comments: [...(selected.comments || []), c] });
    setComment("");
    notify("💬 Comment added");
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
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "tickets", label: "All Tickets", icon: "☰" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f172a; color: #e2e8f0; font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        @keyframes spin { to { transform: rotate(360deg) } }
        .nav-btn:hover { background: #1e293b !important; color: #f1f5f9 !important; }
        .row:hover { background: #1e293b !important; cursor: pointer; }
        .pill-btn:hover { filter: brightness(1.12); }
        .ghost-btn:hover { background: #334155 !important; }
      `}</style>

      {toast && <Toast msg={toast.msg} color={toast.color} />}

      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

        {/* SIDEBAR */}
        <aside style={{ width: 220, background: "#0f172a", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "26px 20px 20px", borderBottom: "1px solid #1e293b" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${BRAND.primaryColor},${BRAND.accentColor})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: 14, fontFamily: "'Syne',sans-serif" }}>
                {BRAND.logoText}
              </div>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: "#f1f5f9" }}>{BRAND.name}</div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>{BRAND.tagline}</div>
              </div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: "14px 10px" }}>
            {NAV.map(n => (
              <button key={n.id} className="nav-btn" onClick={() => setPage(n.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, marginBottom: 4,
                background: page === n.id ? "#1e293b" : "transparent",
                color: page === n.id ? BRAND.primaryColor : "#64748b",
                fontWeight: page === n.id ? 600 : 400, fontSize: 14, border: "none", cursor: "pointer",
                borderLeft: page === n.id ? `3px solid ${BRAND.primaryColor}` : "3px solid transparent",
                transition: "all 0.15s",
              }}><span>{n.icon}</span> {n.label}</button>
            ))}
          </nav>

          <div style={{ padding: "14px 10px", borderTop: "1px solid #1e293b" }}>
            <button className="pill-btn" onClick={() => setShowNew(true)} style={{ width: "100%", padding: "11px 0", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "'Syne',sans-serif", color: "#fff", background: `linear-gradient(135deg,${BRAND.primaryColor},${BRAND.accentColor})`, transition: "filter 0.2s" }}>
              + New Ticket
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, overflow: "auto", background: "#0f172a" }}>

          {page === "dashboard" && (
            <div style={{ padding: "32px 36px" }}>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>Dashboard</h1>
              <p style={{ color: "#475569", fontSize: 14, marginBottom: 32 }}>Live overview — data from your Supabase database</p>
              {loading ? <Spinner /> : (
                <>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 36 }}>
                    {[
                      { label: "Total", value: stats.total, color: BRAND.primaryColor, icon: "🎫" },
                      { label: "Open", value: stats.open, color: "#0ea5e9", icon: "📬" },
                      { label: "In Progress", value: stats.inProgress, color: "#a855f7", icon: "⚙️" },
                      { label: "Critical", value: stats.critical, color: "#ef4444", icon: "🔴" },
                      { label: "Resolved", value: stats.resolved, color: "#22c55e", icon: "✅" },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, minWidth: 130, background: "#1e293b", borderRadius: 14, padding: "18px 20px", borderLeft: `4px solid ${s.color}`, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 12px #0004" }}>
                        <span style={{ fontSize: 26 }}>{s.icon}</span>
                        <div>
                          <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>{s.value}</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{s.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 240, background: "#1e293b", borderRadius: 16, padding: 24, border: "1px solid #334155" }}>
                      <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, color: "#f1f5f9", marginBottom: 18 }}>Priority Breakdown</h3>
                      {PRIORITIES.map(p => {
                        const c = tickets.filter(t => t.priority === p).length;
                        const pct = tickets.length ? Math.round(c / tickets.length * 100) : 0;
                        return (
                          <div key={p} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                              <span style={{ color: "#cbd5e1" }}>{p}</span>
                              <span style={{ color: PRIORITY_COLOR[p], fontWeight: 700 }}>{c}</span>
                            </div>
                            <div style={{ background: "#0f172a", borderRadius: 4, height: 6 }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: PRIORITY_COLOR[p], borderRadius: 4, transition: "width 0.6s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ flex: 1, minWidth: 240, background: "#1e293b", borderRadius: 16, padding: 24, border: "1px solid #334155" }}>
                      <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, color: "#f1f5f9", marginBottom: 18 }}>Status Overview</h3>
                      {STATUSES.map(s => {
                        const c = tickets.filter(t => t.status === s).length;
                        const pct = tickets.length ? Math.round(c / tickets.length * 100) : 0;
                        return (
                          <div key={s} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                              <span style={{ color: "#cbd5e1" }}>{s}</span>
                              <span style={{ color: STATUS_COLOR[s], fontWeight: 700 }}>{c}</span>
                            </div>
                            <div style={{ background: "#0f172a", borderRadius: 4, height: 6 }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: STATUS_COLOR[s], borderRadius: 4, transition: "width 0.6s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ flex: 2, minWidth: 300, background: "#1e293b", borderRadius: 16, padding: 24, border: "1px solid #334155" }}>
                      <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, color: "#f1f5f9", marginBottom: 18 }}>Recent Tickets</h3>
                      {tickets.slice(0, 5).map(t => (
                        <div key={t.id} onClick={() => { setSelected(t); setPage("tickets"); }}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #0f172a", cursor: "pointer" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{t.title}</div>
                            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{t.id} · {t.created}</div>
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

          {page === "tickets" && (
            <div style={{ padding: "32px 36px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>All Tickets</h1>
                  <p style={{ color: "#475569", fontSize: 14 }}>{filtered.length} ticket{filtered.length !== 1 ? "s" : ""} found</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={fetchTickets} style={{ padding: "10px 16px", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>🔄 Refresh</button>
                  <button className="pill-btn" onClick={() => setShowNew(true)} style={{ padding: "10px 22px", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, color: "#fff", background: `linear-gradient(135deg,${BRAND.primaryColor},${BRAND.accentColor})`, transition: "filter 0.2s", fontFamily: "'Syne',sans-serif" }}>
                    + New Ticket
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <input placeholder="Search by title or ID…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 180, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "9px 14px", color: "#f1f5f9", fontSize: 14, outline: "none" }} />
                <select value={fStatus} onChange={e => setFStatus(e.target.value)}
                  style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "9px 14px", color: "#94a3b8", fontSize: 13, outline: "none" }}>
                  <option value="All">All Status</option>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={fPriority} onChange={e => setFPriority(e.target.value)}
                  style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "9px 14px", color: "#94a3b8", fontSize: 13, outline: "none" }}>
                  <option value="All">All Priority</option>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              {loading ? <Spinner /> : (
                <div style={{ background: "#1e293b", borderRadius: 16, overflow: "hidden", border: "1px solid #334155" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#162032" }}>
                        {["ID", "Title", "Category", "Priority", "Status", "Agent", "Created"].map(h => (
                          <th key={h} style={{ padding: "13px 16px", textAlign: "left", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(t => (
                        <tr key={t.id} className="row" onClick={() => setSelected(t)} style={{ borderTop: "1px solid #0f172a", transition: "background 0.15s" }}>
                          <td style={{ padding: "12px 16px", color: BRAND.primaryColor, fontWeight: 700, fontSize: 13 }}>{t.id}</td>
                          <td style={{ padding: "12px 16px", fontSize: 14, color: "#e2e8f0", fontWeight: 500 }}>{t.title}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b" }}>{t.category}</td>
                          <td style={{ padding: "12px 16px" }}><Badge label={t.priority} color={PRIORITY_COLOR[t.priority]} /></td>
                          <td style={{ padding: "12px 16px" }}><Badge label={t.status} color={STATUS_COLOR[t.status]} /></td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b" }}>{t.agent}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#475569" }}>{t.created}</td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#334155", fontSize: 14 }}>No tickets found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showNew && (
        <Modal title="Create New Ticket" onClose={() => setShowNew(false)}>
          <label style={labelStyle}>Issue Title *</label>
          <input style={inputStyle} placeholder="Brief description" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <label style={labelStyle}>Requester Email *</label>
          <input style={inputStyle} type="email" placeholder="user@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} placeholder="Describe the issue…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="ghost-btn" onClick={() => setShowNew(false)} style={{ padding: "10px 20px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "background 0.15s" }}>Cancel</button>
            <button className="pill-btn" onClick={submitTicket} disabled={saving} style={{ padding: "10px 24px", border: "none", borderRadius: 8, color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, background: `linear-gradient(135deg,${BRAND.primaryColor},${BRAND.accentColor})`, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Submit Ticket"}
            </button>
          </div>
        </Modal>
      )}

      {selected && (
        <Modal title={`${selected.id} — ${selected.title}`} onClose={() => setSelected(null)}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            <Badge label={selected.priority} color={PRIORITY_COLOR[selected.priority]} />
            <Badge label={selected.status} color={STATUS_COLOR[selected.status]} />
            <Badge label={selected.category} color="#64748b" />
          </div>
          <div style={{ background: "#0f172a", borderRadius: 10, padding: 14, marginBottom: 18, fontSize: 14, color: "#cbd5e1", lineHeight: 1.7 }}>
            {selected.description || "No description provided."}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Change Status</label>
              <select style={inputStyle} value={selected.status} onChange={e => updateTicket(selected.id, { status: e.target.value })}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Assign Agent</label>
              <select style={inputStyle} value={selected.agent} onChange={e => updateTicket(selected.id, { agent: e.target.value })}>
                {AGENTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 20 }}>📧 {selected.email} &nbsp;·&nbsp; 📅 {selected.created}</div>
          <div style={{ borderTop: "1px solid #334155", paddingTop: 18 }}>
            <h4 style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Comments ({selected.comments?.length || 0})</h4>
            {selected.comments?.map((c, i) => (
              <div key={i} style={{ background: "#0f172a", borderRadius: 8, padding: "10px 14px", marginBottom: 8, fontSize: 13, color: "#cbd5e1" }}>
                <span style={{ color: BRAND.primaryColor, fontWeight: 700 }}>{c.by}</span>
                <span style={{ color: "#334155" }}> · {c.at}</span>
                <div style={{ marginTop: 4 }}>{c.text}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && postComment()}
                placeholder="Write a comment and press Enter…"
                style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "9px 14px", color: "#f1f5f9", fontSize: 13, outline: "none" }} />
              <button onClick={postComment} style={{ padding: "9px 18px", background: BRAND.primaryColor, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Post</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}