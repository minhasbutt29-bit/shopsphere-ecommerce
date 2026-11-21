import nodemailer from "nodemailer";
import { appUrl } from "./utils";
import { formatMoney } from "./money";

let transporter: nodemailer.Transporter | null = null;

function getTransport() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function layout(title: string, body: string) {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
  <h1 style="font-size:20px;letter-spacing:.08em;text-transform:uppercase">ShopSphere</h1>
  <h2 style="font-size:18px">${esc(title)}</h2>${body}
  <p style="color:#777;font-size:12px;margin-top:32px">You are receiving this email because of activity on your ShopSphere account.</p></div>`;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const t = getTransport();
  if (!t) {
    console.warn(`[email] SMTP not configured. Would send "${subject}" to ${to}`);
    if (process.env.NODE_ENV !== "production") console.warn(html.replace(/<[^>]+>/g, " "));
    return;
  }
  await t.sendMail({ from: process.env.EMAIL_FROM ?? "ShopSphere <no-reply@example.com>", to, subject, html });
}

const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;background:#111;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none">${esc(label)}</a></p>`;

export const emails = {
  verify: (to: string, token: string) =>
    sendEmail(to, "Verify your email", layout("Verify your email", `<p>Confirm your address to activate your account. This link expires in 24 hours.</p>${button(appUrl(`/verify-email?token=${token}`), "Verify email")}`)),
  reset: (to: string, token: string) =>
    sendEmail(to, "Reset your password", layout("Reset your password", `<p>Use the button below to choose a new password. This link expires in 1 hour. If you did not request it, ignore this email.</p>${button(appUrl(`/reset-password?token=${token}`), "Reset password")}`)),
  orderConfirmation: (to: string, order: { number: string; totalCents: number; currency: string }) =>
    sendEmail(to, `Order ${order.number} confirmed`, layout("Thank you for your order", `<p>Order <strong>${esc(order.number)}</strong> totalling <strong>${formatMoney(order.totalCents, order.currency)}</strong> has been received.</p>${button(appUrl(`/account/orders`), "View my orders")}`)),
  orderStatus: (to: string, number: string, status: string) =>
    sendEmail(to, `Order ${number} is now ${status.toLowerCase()}`, layout("Order update", `<p>Your order <strong>${esc(number)}</strong> is now <strong>${esc(status)}</strong>.</p>`)),
  lowStock: (to: string, items: { name: string; sku: string; stock: number }[]) =>
    sendEmail(to, "Low stock alert", layout("Low stock alert", `<ul>${items.map((i) => `<li>${esc(i.name)} (${esc(i.sku)}) — ${i.stock} left</li>`).join("")}</ul>`)),
  contact: (to: string, from: { name: string; email: string; message: string }) =>
    sendEmail(to, `Contact form: ${from.name}`, layout("New contact message", `<p><strong>${esc(from.name)}</strong> (${esc(from.email)})</p><p>${esc(from.message)}</p>`)),
};
