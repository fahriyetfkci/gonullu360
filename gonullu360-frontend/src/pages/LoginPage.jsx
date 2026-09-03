import React, { useEffect, useState } from 'react';
import logo from '../assets/gonullu360-logo.png';
import { register, requestPasswordReset, resetPassword, verifyEmail } from '../services/api';
import { useAuth } from '../features/auth/AuthProvider';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [info, setInfo] = useState('');
  const [name, setName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState(import.meta.env.VITE_ORGANIZATION_SLUG || 'gonullu360');

  useEffect(() => {
    if (!window.location.hash.startsWith('#verify-email?')) return;
    const token = new URLSearchParams(window.location.hash.split('?')[1]).get('token');
    if (!token) return;
    setLoading(true);
    verifyEmail(token).then(result => {
      setInfo(result.message);
      window.location.hash = '';
    }).catch(error => setError(error.response?.data?.error || 'E-posta doğrulanamadı.')).finally(() => setLoading(false));
  }, []);

  const submit = async event => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const result = await login(email, password, useBackupCode ? '' : mfaCode, useBackupCode ? mfaCode : '');
      if (result.mfaRequired) { setMfaRequired(true); return; }
      window.location.hash = 'dashboard';
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    } finally { setLoading(false); }
  };

  const requestReset = async event => {
    event.preventDefault(); setLoading(true); setError(''); setInfo('');
    try {
      const result = await requestPasswordReset(email);
      setMode('reset');
      setInfo(result.demoCode ? `Demo doğrulama kodu: ${result.demoCode}` : 'Doğrulama kodu e-posta adresinize gönderildi.');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Doğrulama kodu gönderilemedi.');
    } finally { setLoading(false); }
  };

  const completeReset = async event => {
    event.preventDefault(); setLoading(true); setError(''); setInfo('');
    if (newPassword !== confirmPassword) { setError('Şifreler birbiriyle aynı değil.'); setLoading(false); return; }
    try {
      const result = await resetPassword(email, resetCode, newPassword);
      setMode('login'); setPassword(''); setResetCode(''); setNewPassword(''); setConfirmPassword('');
      setInfo(result.message);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Şifre yenilenemedi.');
    } finally { setLoading(false); }
  };

  const completeRegistration = async event => {
    event.preventDefault(); setLoading(true); setError(''); setInfo('');
    try {
      const result = await register(organizationSlug, name, email, password);
      setInfo(result.demoVerificationToken ? `Demo doğrulama bağlantısı: ${window.location.origin}/#verify-email?token=${result.demoVerificationToken}` : result.message);
      setMode('login'); setPassword('');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Kayıt oluşturulamadı.');
    } finally { setLoading(false); }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <img className="login-logo" src={logo} alt="Gönüllü 360" />
        <h1 id="login-title" className="login-visually-hidden">Yönetici Girişi</h1>
        {mode === 'register' ? <form onSubmit={completeRegistration}>
          <div className="login-reset-heading"><strong>Kayıt Ol</strong><span>E-posta doğrulamasından sonra hesabınız etkinleşir.</span></div>
          <label htmlFor="register-org">Organizasyon kodu</label>
          <input id="register-org" value={organizationSlug} onChange={event=>setOrganizationSlug(event.target.value.toLowerCase())} required />
          <label htmlFor="register-name">Ad soyad</label>
          <input id="register-name" value={name} onChange={event=>setName(event.target.value)} autoComplete="name" required />
          <label htmlFor="register-email">E-posta</label>
          <input id="register-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" required />
          <label htmlFor="register-password">Şifre</label>
          <input id="register-password" type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="new-password" minLength="10" required />
          <small>En az 10 karakter; büyük harf, küçük harf, rakam ve özel karakter kullanın.</small>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-submit" type="submit" disabled={loading}>{loading ? 'Kaydediliyor…' : 'Kayıt Ol'}</button>
          <button type="button" className="login-back" onClick={()=>{setMode('login');setError('');}}>Girişe dön</button>
        </form> : mode === 'forgot' ? <form onSubmit={requestReset}>
          <div className="login-reset-heading"><strong>Parolamı Unuttum</strong><span>E-posta adresinize 6 haneli bir doğrulama kodu göndereceğiz.</span></div>
          <label htmlFor="forgot-email">E-posta</label>
          <input id="forgot-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="email" required autoFocus />
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-submit" type="submit" disabled={loading}>{loading ? 'Gönderiliyor…' : 'Kod Gönder'}</button>
          <button type="button" className="login-back" onClick={()=>{setMode('login');setError('');setInfo('');}}>Girişe dön</button>
        </form> : mode === 'reset' ? <form onSubmit={completeReset}>
          <div className="login-reset-heading"><strong>Yeni Şifre Oluştur</strong><span>{email} adresine gönderilen kodu yazın.</span></div>
          <label htmlFor="reset-code">Doğrulama kodu</label>
          <input id="reset-code" inputMode="numeric" value={resetCode} onChange={event=>setResetCode(event.target.value.replace(/\D/g,'').slice(0,6))} required autoFocus />
          <label htmlFor="new-password">Yeni şifre</label>
          <input id="new-password" type="password" value={newPassword} onChange={event=>setNewPassword(event.target.value)} autoComplete="new-password" minLength="10" required />
          <label htmlFor="confirm-password">Yeni şifre tekrar</label>
          <input id="confirm-password" type="password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} autoComplete="new-password" minLength="10" required />
          {info && <div className="login-info">{info}</div>}
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="login-submit" type="submit" disabled={loading}>{loading ? 'Yenileniyor…' : 'Şifreyi Yenile'}</button>
          <button type="button" className="login-back" onClick={()=>{setMode('forgot');setError('');}}>Kodu yeniden gönder</button>
        </form> : <form onSubmit={submit}>
          <label htmlFor="login-email">E-posta</label>
          <input id="login-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} autoComplete="username" required disabled={mfaRequired} />
          <label htmlFor="login-password">Şifre</label>
          <input id="login-password" type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password" required disabled={mfaRequired} />
          {!mfaRequired && <button type="button" className="login-forgot" onClick={()=>{setMode('forgot');setError('');setInfo('');}}>Parolamı unuttum</button>}
          {mfaRequired && <><label htmlFor="login-mfa">{useBackupCode?'Yedek kod':'Doğrulama kodu'}</label><input id="login-mfa" inputMode={useBackupCode?'text':'numeric'} value={mfaCode} onChange={event=>setMfaCode(useBackupCode?event.target.value.toUpperCase():event.target.value.replace(/\D/g,'').slice(0,6))} autoComplete="one-time-code" required autoFocus /><button type="button" className="login-code-switch" onClick={()=>{setUseBackupCode(value=>!value);setMfaCode('');}}>{useBackupCode?'Doğrulayıcı kodu kullan':'Yedek kod kullan'}</button></>}
          {error && <div className="login-error" role="alert">{error}</div>}
          {info && <div className="login-info">{info}</div>}
          <button className="login-submit" type="submit" disabled={loading}>{loading ? 'Kontrol ediliyor…' : mfaRequired ? 'Kodu Doğrula' : 'Giriş'}</button>
          {mfaRequired && <button type="button" className="login-back" onClick={()=>{setMfaRequired(false);setMfaCode('');setError('');}}>Geri dön</button>}
          {!mfaRequired && <button type="button" className="login-register" onClick={()=>{setMode('register');setError('');setInfo('');}}>Kayıt Ol</button>}
        </form>}
      </section>
    </main>
  );
}
