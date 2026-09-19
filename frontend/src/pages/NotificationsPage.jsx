import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { getNotifications, markNotificationRead } from '../services/api';
import './ManagementPage.css';

export default function NotificationsPage() {
  const [items, setItems] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1), [pages, setPages] = useState(1);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    getNotifications(page).then(data => { if (active) { setItems(data.notifications); setPages(Math.max(1, data.pagination.totalPages)); } })
      .catch(() => { if (active) setError('Bildirimler yüklenemedi.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);
  async function read(item) {
    try { await markNotificationRead(item.id); setItems(current => current.map(row => row.id === item.id ? { ...row, read: 1 } : row)); }
    catch { setError('Bildirim güncellenemedi.'); }
  }
  return <div className="management-layout"><Sidebar /><div className="management-content"><Navbar /><main className="management-main">
    <h1>Bildirimler</h1>{error && <p role="alert">{error}</p>}
    {loading ? <p>Yükleniyor…</p> : <><div className="management-card">{items.length === 0 && <p>Henüz bildirim yok.</p>}{items.map(item => <article key={item.id}><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString('tr-TR')}</small>{item.read === 0 && <button onClick={() => read(item)}>Okundu işaretle</button>}</article>)}</div>
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Önceki</button> {page} / {pages} <button disabled={page >= pages} onClick={() => setPage(page + 1)}>Sonraki</button></>}
  </main></div></div>;
}
