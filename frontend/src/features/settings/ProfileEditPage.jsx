import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { SettingsShell } from './SettingsPage';
import SettingsIcon from './SettingsIcon';
import { getAccountProfile, saveAccountProfile } from './profileApi';
import './ProfileEditPage.css';

const fields = ['name', 'email', 'phone', 'jobTitle', 'about', 'address', 'website'];
function toForm(profile) {
  return { ...Object.fromEntries(fields.map(key => [key, profile[key] || ''])), photo: profile.photo || null };
}

export default function ProfileEditPage() {
  const { updateSessionProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const fileInput = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    getAccountProfile().then(data => {
      if (active) { setProfile(data); setForm(toForm(data)); }
    }).catch(() => { if (active) setError('Profil bilgileri yüklenemedi. Lütfen tekrar deneyin.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => () => readerRef.current?.abort(), []);

  function change(event) {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
    setMessage('');
  }

  function selectPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(''); setMessage('');
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 1024 * 1024) {
      setError('En fazla 1 MB boyutunda PNG veya JPEG görsel seçin.');
      return;
    }
    const reader = new FileReader();
    readerRef.current = reader;
    setReadingPhoto(true);
    reader.onload = () => { setForm(current => ({ ...current, photo: reader.result })); setReadingPhoto(false); };
    reader.onerror = () => { setError('Görsel okunamadı. Başka bir görsel seçin.'); setReadingPhoto(false); };
    reader.readAsDataURL(file);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const saved = await saveAccountProfile({ ...form, name: form.name.trim(), email: form.email.trim(), website: form.website.trim() });
      const emailChanged = profile.email !== saved.email;
      setProfile(saved); setForm(toForm(saved));
      updateSessionProfile(saved);
      setMessage(emailChanged ? 'Profiliniz kaydedildi. Sonraki girişinizde yeni e-posta adresinizi kullanın.' : 'Profiliniz kaydedildi.');
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Profil kaydedilemedi. Lütfen tekrar deneyin.');
    } finally { setSaving(false); }
  }

  return <SettingsShell><div className="profile-edit-page">
    <h2>Profili Düzenle</h2>
    <div className="profile-edit-tab"><span><SettingsIcon name="user" size={18} />Hesap</span></div>
    {loading ? <p role="status">Profil yükleniyor…</p> : !form ? <div><p role="alert">{error}</p><button className="profile-edit-save" onClick={() => setAttempt(value => value + 1)}>Tekrar dene</button></div> :
      <form className="profile-edit-card" onSubmit={save}>
        <fieldset disabled={saving || readingPhoto}>
          <div className="profile-edit-identity">
            <div className="profile-edit-avatar">{form.photo ? <img src={form.photo} alt="Profil görseli" /> : <SettingsIcon name="profile" size={24} />}</div>
            <strong>{profile.organization?.name || profile.name}</strong>
            <input ref={fileInput} className="profile-edit-file" type="file" accept="image/png,image/jpeg" onChange={selectPhoto} aria-label="Profil görseli seç" />
            <button type="button" className="profile-edit-upload" onClick={() => fileInput.current?.click()}>{readingPhoto ? 'Görsel okunuyor…' : 'Yeni Görsel Ekle'}</button>
          </div>
          <div className="profile-edit-section-title"><h3>Genel Bilgiler</h3><p>Lütfen doldurunuz</p></div>
          <div className="profile-edit-fields">
            <label>Ad Soyad<input name="name" value={form.name} onChange={change} placeholder="Ad Soyad" required minLength={2} maxLength={100} autoComplete="name" /></label>
            <label>Email<input name="email" value={form.email} onChange={change} placeholder="kullanici@example.com" type="email" required maxLength={254} autoComplete="email" /></label>
            <label>Telefon<input name="phone" value={form.phone} onChange={change} placeholder="..." type="tel" maxLength={40} autoComplete="tel" /></label>
            <label>Görev<input name="jobTitle" value={form.jobTitle} onChange={change} placeholder="..." maxLength={100} autoComplete="organization-title" /></label>
            <label className="profile-edit-about">Hakkında<textarea name="about" value={form.about} onChange={change} placeholder="Kendinden bahset" maxLength={2000} /></label>
            <label>Adres<input name="address" value={form.address} onChange={change} placeholder="..." maxLength={500} autoComplete="street-address" /></label>
            <label>Website<input name="website" value={form.website} onChange={change} placeholder="https://..." type="url" pattern="https?://.*" maxLength={500} autoComplete="url" /></label>
          </div>
          <button type="submit" className="profile-edit-save">{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </fieldset>
        {error && <p className="profile-edit-error" role="alert">{error}</p>}
        {message && <p className="profile-edit-success" role="status">{message}</p>}
      </form>}
  </div></SettingsShell>;
}
