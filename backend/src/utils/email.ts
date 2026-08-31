import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  disableFileAccess: true,
  disableUrlAccess: true,
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(opts: MailOptions): Promise<void> {
  try {
    await transporter.sendMail({ from: env.EMAIL_FROM, ...opts });
  } catch (err) {
    logger.error("Failed to send email", { to: opts.to, subject: opts.subject, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

export function buildVerifyEmailHtml(verifyUrl: string): string {
  return `
    <p>Email adresinizi doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>Bu bağlantı 24 saat geçerlidir.</p>
  `;
}

export function buildResetPasswordHtml(resetUrl: string): string {
  return `
    <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>Bu bağlantı 1 saat geçerlidir. Eğer bu talebi siz yapmadıysanız görmezden gelin.</p>
  `;
}
