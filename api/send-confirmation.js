// This is a Vercel Serverless Function
// It runs on the server (not in the browser)
// so it's safe to use secret API keys here

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, ticketId, title, priority, category } = req.body;

  // Your Resend API key (stored safely in environment variables)
  const RESEND_KEY = process.env.VITE_RESEND_KEY;

  // Build the email we want to send
  const emailBody = {
    from: "HelpDesk <onboarding@resend.dev>", // Resend's free sender address
    to: [to],
    subject: `[${ticketId}] Your IT support ticket has been received`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
        
        <div style="background: linear-gradient(135deg, #0ea5e9, #f59e0b); padding: 24px; border-radius: 10px; margin-bottom: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">HelpDesk Pro</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">IT Support Portal</p>
        </div>

        <h2 style="color: #0f172a; margin-bottom: 8px;">✅ Ticket Received!</h2>
        <p style="color: #475569; margin-bottom: 24px;">
          We've received your support request and our team will get back to you shortly.
        </p>

        <div style="background: white; border-radius: 10px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;">Ticket ID</td>
              <td style="padding: 8px 0; color: #0ea5e9; font-weight: 700; font-size: 14px;">${ticketId}</td>
            </tr>
            <tr style="border-top: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Issue</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 500;">${title}</td>
            </tr>
            <tr style="border-top: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Category</td>
              <td style="padding: 8px 0; color: #0f172a; font-size: 14px;">${category}</td>
            </tr>
            <tr style="border-top: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Priority</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 700; color: ${
                priority === "Critical" ? "#ef4444" :
                priority === "High"     ? "#f97316" :
                priority === "Medium"   ? "#f59e0b" : "#22c55e"
              };">${priority}</td>
            </tr>
            <tr style="border-top: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Status</td>
              <td style="padding: 8px 0; color: #0ea5e9; font-size: 14px; font-weight: 700;">Open</td>
            </tr>
          </table>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
          Our IT team typically responds within <strong>2-4 business hours</strong>. 
          You'll receive another email when your ticket status changes.
        </p>

        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">HelpDesk Pro — IT Support Portal</p>
        </div>
      </div>
    `,
  };

  try {
    // Send the email using Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: data.message || "Failed to send email" });
    }

    return res.status(200).json({ success: true, id: data.id });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}