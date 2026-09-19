import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { apiClient } from '../services/client';
import './ManagementPage.css';

const initial = { name: '', city: '', gender: '', age: '', education: '', phone: '', email: '', address: '', coverLetter: '' };
export default function DataEntryPage() {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await apiClient.post('/applications', { ...form, age: Number(form.age) });
      window.location.hash = `application/${response.data.data.id}`;
    } catch (err) { setError(err.response?.data?.error?.message || 'Başvuru kaydedilemedi. Alanları kontrol edip tekrar deneyin.'); }
    finally { setSaving(false); }
  }
  return <div className="management-layout"><Sidebar /><div className="management-content"><Navbar /><main className="management-main">
    <h1>Yeni Gönüllü Başvurusu</h1><p>Başvuruyu kaydettikten sonra inceleyip gönüllü olarak kabul edebilirsiniz.</p>
    <form onSubmit={submit} className="management-card management-form">
      {error && <p role="alert">{error}</p>}
      {Object.entries({ name: 'Ad Soyad', city: 'Şehir', gender: 'Cinsiyet', age: 'Yaş', education: 'Eğitim Düzeyi', phone: 'Telefon', email: 'E-posta', address: 'Adres', coverLetter: 'Ön Yazı' }).map(([name, label]) =>
        <label key={name}>{label}<input name={name} value={form[name]} required={['name', 'city', 'gender', 'age', 'education'].includes(name)} type={name === 'age' ? 'number' : name === 'email' ? 'email' : 'text'} min={name === 'age' ? 1 : undefined} max={name === 'age' ? 120 : undefined} maxLength={['name', 'city', 'gender', 'education'].includes(name) ? 200 : 4000} onChange={event => setForm({ ...form, [name]: event.target.value })} /></label>
      )}
      <button disabled={saving}>{saving ? 'Kaydediliyor…' : 'Başvuruyu Kaydet'}</button>
    </form>
  </main></div></div>;
}
