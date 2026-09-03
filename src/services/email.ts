import nodemailer from 'nodemailer';
import { config } from '../config';

export async function sendPasswordResetCode(email: string, code: string) {
  const { host, port, secure, user, password, from } = config.smtp;
  if (!host || !user || !password || !from) return false;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password },
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  await transporter.sendMail({
    from,
    to: email,
    subject: 'Gönüllü 360 parola sıfırlama kodu',
    text: `Parola sıfırlama kodunuz: ${code}\n\nBu kod 10 dakika geçerlidir. Bu işlemi siz istemediyseniz mesajı dikkate almayın.`,
    html: `<p>Parola sıfırlama kodunuz:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Bu kod 10 dakika geçerlidir. Bu işlemi siz istemediyseniz mesajı dikkate almayın.</p>`,
  });
  return true;
}

export async function sendEmailVerification(email: string, token: string) {
  const { host, port, secure, user, password, from } = config.smtp;
  if (!host || !user || !password || !from) return false;
  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass: password }, disableFileAccess: true, disableUrlAccess: true });
  const verifyUrl = `${config.frontendOrigin}/#verify-email?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from, to: email, subject: 'Gönüllü 360 e-posta doğrulama',
    text: `E-posta adresinizi doğrulamak için bağlantıyı açın: ${verifyUrl}`,
    html: `<p>E-posta adresinizi doğrulamak için aşağıdaki bağlantıyı açın:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
  return true;
}
