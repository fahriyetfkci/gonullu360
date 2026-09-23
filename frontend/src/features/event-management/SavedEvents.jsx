import { useEffect, useState } from 'react';
import { apiClient } from '../../services/client';

const statuses = { SCHEDULED: 'Planlandı', COMPLETED: 'Tamamlandı', CANCELLED: 'İptal edildi' };
export default function SavedEvents({ revision }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [page, setPage] = useState(1), [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false), [participants, setParticipants] = useState({});
  useEffect(() => {
    let active = true;
    apiClient.get('/events', { params: { page, limit: 10 } }).then(response => { if (active) { setData(response.data.data); setError(''); } }).catch(() => { if (active) setError('Etkinlikler yüklenemedi.'); });
    return () => { active = false; };
  }, [page, revision, reload]);
  async function action(path, payload, method = 'patch') {
    setBusy(true); setError('');
    try { await apiClient[method](path, payload); setReload(value => value + 1); }
    catch (err) { setError(err.response?.data?.error?.message || 'İşlem tamamlanamadı.'); }
    finally { setBusy(false); }
  }
  return <section className="event-card saved-events"><h2>Kayıtlı Etkinlikler</h2>
    {error && <p role="alert">{error}</p>}{data?.items.length === 0 && <p>Henüz etkinlik yok.</p>}
    {data?.items.map(item => <article key={item.id} style={{ borderBottom: '1px solid #ddd', padding: '16px 0' }}>
      <strong>{item.name}</strong><p>{new Date(item.startsAt).toLocaleString('tr-TR')} · {statuses[item.status]}</p>
      <label>Durum <select aria-label={`${item.name} durumu`} disabled={busy} value={item.status} onChange={event => action(`/events/${item.id}/status`, { status: event.target.value })}>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <form onSubmit={event => { event.preventDefault(); action(`/events/${item.id}/participants`, { volunteerId: Number(participants[item.id]) }, 'post'); }} style={{ marginTop: 12 }}>
        <label>Gönüllü numarası <input type="number" min="1" required value={participants[item.id] || ''} onChange={event => setParticipants({ ...participants, [item.id]: event.target.value })} /></label> <button disabled={busy}>Katılım Ekle</button>
      </form>
    </article>)}
    <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Önceki</button> {page} <button disabled={!data || page * 10 >= data.pagination.total} onClick={() => setPage(page + 1)}>Sonraki</button>
  </section>;
}
