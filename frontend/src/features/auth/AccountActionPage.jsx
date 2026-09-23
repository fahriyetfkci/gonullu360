import { useState } from 'react';
import axios from 'axios';
import './login.css';

export default function AccountActionPage() {
  const resetting = window.location.pathname === '/reset-password';
  const token = new URLSearchParams(window.location.search).get('token');
  const [password, setPassword] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/${resetting ? 'reset-password' : 'verify-email'}`, { token, ...(resetting ? { password } : {}) }, { timeout: 15000 });
      setDone(true); setMessage(resetting ? 'Şifreniz güncellendi.' : 'E-posta adresiniz doğrulandı.');
    } catch { setMessage('İşlem tamamlanamadı. Bağlantı geçersiz veya süresi dolmuş olabilir. Şifreniz en az 8 karakter, büyük/küçük harf, rakam ve özel karakter içermelidir.'); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><section className="login-form-panel"><form className="login-card" onSubmit={submit}>
    <h1>{resetting ? 'Yeni Şifre Belirle' : 'E-posta Doğrulama'}</h1>
    {!token && <p role="alert">Bağlantıda doğrulama anahtarı bulunamadı.</p>}
    {resetting && !done && <label>Yeni şifre<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label>}
    {message && <p role="alert">{message}</p>}
    {!done && <button disabled={!token || busy}>{busy ? 'İşleniyor…' : resetting ? 'Şifreyi Güncelle' : 'E-postayı Doğrula'}</button>}
    <p><a href="/">Giriş sayfasına dön</a></p>
  </form></section></main>;
}
