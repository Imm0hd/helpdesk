export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, ticketId, title, priority, category, description } = req.body;
  const RESEND_KEY = process.env.VITE_RESEND_KEY;

  const customerEmail = {
    from: "HelpDesk <onboarding@resend.dev>",
    to: [to],
    subject: `[${ticketId}] Your IT support ticket has been received`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;"><div style="background:linear-gradient(135deg,#0ea5e9,#f59e0b);padding:24px;border-radius:10px;margin-bottom:24px;text-align:center;"><h1 style="color:white;margin:0;font-size:22px;">HelpDesk Pro</h1><p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">IT Support Portal</p></div><h2 style="color:#0f172a;">✅ Ticket Received!</h2><p style="color:#475569;margin-bottom:24px;">We received your request and will respond within 2-4 business hours.</p><div style="background:white;border-radius:10px;padding:20px;border:1px solid #e2e8f0;"><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:120px;">Ticket ID</td><td style="padding:8px 0;color:#0ea5e9;font-weight:700;">${ticketId}</td></tr><tr style="border-top:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;font-size:13px;">Issue</td><td style="padding:8px 0;color:#0f172a;font-weight:500;">${title}</td></tr><tr style="border-top:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;font-size:13px;">Category</td><td style="padding:8px 0;color:#0f172a;">${category}</td></tr><tr style="border-top:1px solid #f1f5f9;"><td style="padding:8px 0;color:#64748b;font-size:13px;">Priority</td><td style="padding:8px 0;font-weight:700;color:${priority==="Critical"?"#ef4444":priority==="High"?"#f97316":priority==="Medium"?"#f59e0b":"#22c55e"};">${priority}</td></tr></table></div></div>`,
  };

  const adminEmail = {
    from: "HelpDesk <onboarding@resend.dev>",
    to: ["alofi153000@gmail.com"],
    subject: `🔔 New ${priority} Ticket: [${ticketId}] ${title}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#0f172a;border-radius:12px;"><div style="background:linear-gradient(135deg,#0ea5e9,#f59e0b);padding:20px 24px;border-radius:10px;margin-bottom:24px;"><h1 style="color:white;margin:0;font-size:18px;">🔔 New Support Ticket</h1></div><div style="background:#1e293b;border-radius:10px;padding:20px;border:1px solid #334155;margin-bottom:20px;"><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:10px 0;color:#64748b;font-size:13px;width:130px;">Ticket ID</td><td style="padding:10px 0;color:#0ea5e9;font-weight:700;font-size:15px;">${ticketId}</td></tr><tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;font-size:13px;">Issue</td><td style="padding:10px 0;color:#f1f5f9;font-weight:600;">${title}</td></tr><tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;font-size:13px;">From</td><td style="padding:10px 0;color:#f1f5f9;">${to}</td></tr><tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;font-size:13px;">Priority</td><td style="padding:10px 0;font-weight:800;color:${priority==="Critical"?"#ef4444":priority==="High"?"#f97316":priority==="Medium"?"#f59e0b":"#22c55e"};">⚡ ${priority}</td></tr><tr style="border-top:1px solid #334155;"><td style="padding:10px 0;color:#64748b;font-size:13px;">Description</td><td style="padding:10px 0;color:#94a3b8;font-size:13px;">${description||"No description."}</td></tr></table></div><a href="https://helpdesk-one-alpha.vercel.app" style="display:block;text-align:center;background:linear-gradient(135deg,#0ea5e9,#f59e0b);color:white;padding:14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:20px;">👉 Open HelpDesk Portal</a></div>`,
  };

  try {
    await Promise.all([
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(customerEmail),
      }),
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(adminEmail),
      }),
    ]);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}