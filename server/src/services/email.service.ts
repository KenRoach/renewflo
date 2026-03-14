import { Resend } from 'resend';
import { config } from '../config.js';

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

if (!resend) {
  console.warn('[email] RESEND_API_KEY not set — email sending disabled');
}

const FROM_EMAIL = 'quotes@renewflow.io';
const FALLBACK_FROM = 'RenewFlow <onboarding@resend.dev>';

interface QuoteEmailData {
  quoteId: string;
  status: string;
  totalAmount: number | null;
  currency: string;
  lineItems: { brand: string; model: string; coverage_type: string; unit_price: number | null; quantity: number }[];
  senderName: string;
}

function buildHtml(data: QuoteEmailData): string {
  const rows = data.lineItems.map((li) =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0">${li.brand} ${li.model}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0">${li.coverage_type.toUpperCase()}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;text-align:center">${li.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;text-align:right">${li.unit_price != null ? `$${li.unit_price.toLocaleString()}` : 'TBD'}</td>
    </tr>`
  ).join('');

  const total = data.totalAmount != null ? `$${data.totalAmount.toLocaleString()}` : 'Pending';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px">
    <div style="background:#2563EB;border-radius:12px 12px 0 0;padding:24px 32px">
      <h1 style="color:#fff;font-size:20px;margin:0">RenewFlow</h1>
      <p style="color:#BFDBFE;font-size:13px;margin:6px 0 0">Warranty Renewal Quote</p>
    </div>
    <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;padding:24px 32px">
      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px">
        ${data.senderName} has shared a warranty renewal quote with you.
      </p>
      <div style="background:#F1F5F9;border-radius:8px;padding:12px 16px;margin-bottom:20px">
        <span style="font-size:12px;color:#64748B">Quote ID</span>
        <div style="font-size:16px;font-weight:700;color:#1E293B">${data.quoteId.slice(0, 8)}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
        <thead>
          <tr style="background:#F1F5F9">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748B;text-transform:uppercase">Device</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748B;text-transform:uppercase">Coverage</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748B;text-transform:uppercase">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748B;text-transform:uppercase">Price</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="text-align:right;font-size:18px;font-weight:700;color:#2563EB;margin-bottom:24px">
        Total: ${total} ${data.currency}
      </div>
      <a href="https://renewflow.io" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
        View in RenewFlow
      </a>
    </div>
    <p style="text-align:center;font-size:11px;color:#94A3B8;margin-top:20px">
      RenewFlow — Warranty renewal management for LATAM IT channel partners
    </p>
  </div>
</body>
</html>`;
}

export const emailService = {
  async sendQuoteEmail(
    recipients: string[],
    data: QuoteEmailData,
  ): Promise<{ sent: string[]; failed: string[] }> {
    if (!resend) {
      return { sent: [], failed: recipients };
    }

    const sent: string[] = [];
    const failed: string[] = [];
    const html = buildHtml(data);
    const subject = `Warranty Renewal Quote ${data.quoteId.slice(0, 8)} — RenewFlow`;

    for (const to of recipients) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to,
          subject,
          html,
        });
        sent.push(to);
      } catch (err) {
        console.error(`[email] Failed to send to ${to}:`, (err as Error).message);
        // Try fallback sender
        try {
          await resend.emails.send({ from: FALLBACK_FROM, to, subject, html });
          sent.push(to);
        } catch {
          failed.push(to);
        }
      }
    }

    return { sent, failed };
  },
};
