import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { getEventDetail, getEventReport, saveEventNotes, saveEventReport, setEventTaskCompleted } from '../services/api';
import './EventDetailPage.css';
import './EventVolunteersDialog.css';

const formatDate = value => new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));

function Poster({ event }) {
  if (event.imageUrl) return <img className="event-poster" src={event.imageUrl} alt={`${event.name} afişi`} />;
  const normalizedName = event.name.toLocaleLowerCase('tr-TR');
  const isSport = normalizedName.includes('spor') || normalizedName.includes('turnuva');
  const poster = isSport
    ? { eyebrow: 'HAREKETE GEÇ', title: 'SPOR TURNUVASI', icon: '🏆', message: 'Takım ruhunu birlikte yaşa.' }
    : { eyebrow: 'HER GÜN EN AZ 30 DK.', title: event.name.toLocaleUpperCase('tr-TR'), icon: '📚', message: 'Birlikte öğreniyor, birlikte gelişiyoruz.' };
  return <div className="event-poster event-poster--placeholder" aria-label="Etkinlik afişi">
    <div className="poster-wave" />
    <small>{poster.eyebrow}</small>
    <strong>{poster.title}</strong>
    <span>{poster.icon}</span>
    <b>{poster.message}</b>
  </div>;
}

export default function EventDetailPage() {
  const [event, setEvent] = useState(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [volunteersOpen, setVolunteersOpen] = useState(false);
  const timer = useRef();
  const id = window.location.hash.match(/^#events\/(\d+)/)?.[1];

  useEffect(() => {
    let active = true;
    getEventDetail(id).then(data => {
      if (!active) return;
      setEvent(data); setNotes(data.notes || ''); setStatus('ready');
    }).catch(error => {
      if (!active) return;
      setMessage(error.response?.data?.error || 'Etkinlik bilgileri alınamadı.'); setStatus('error');
    });
    return () => { active = false; clearTimeout(timer.current); };
  }, [id]);

  const changeNotes = value => {
    setNotes(value); setMessage('Kaydediliyor…'); clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { await saveEventNotes(event.id, value); setMessage('Notlar kaydedildi'); }
      catch { setMessage('Notlar kaydedilemedi'); }
    }, 650);
  };

  const toggleTask = async task => {
    const completed = !task.completed;
    setEvent(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, completed } : item) }));
    try { await setEventTaskCompleted(event.id, task.id, completed); }
    catch {
      setEvent(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? task : item) }));
      setMessage('Görev güncellenemedi');
    }
  };

  return <div className="event-detail-shell">
    <Sidebar />
    <div className="event-detail-content">
      <Navbar />
      {status === 'loading' && <main className="event-state">Etkinlik yükleniyor…</main>}
      {status === 'error' && <main className="event-state event-state--error">{message}</main>}
      {event && <main className="event-detail-grid">
        <section className="event-summary-column">
          <Poster event={event} />
          <h1>{event.name}</h1>
          <div className="event-meta"><span>▣</span><b>{formatDate(event.date)} | {event.time}</b><em>{event.groupName}</em></div>
          <p className="event-code">Etkinlik ID : {event.id}</p>
          <div className="event-action-grid">
            <button type="button" onClick={() => setReportOpen(true)}>Etkinlik Raporu</button>
            <button type="button" onClick={() => setVolunteersOpen(true)}>Gönüllüler</button>
            {['Fotoğraflar', 'Görevliler', 'Harcamalar', 'Formlar'].map(label => <button type="button" key={label}>{label}</button>)}
          </div>
        </section>

        <section className="event-work-column">
          <div className="event-notes-card">
            <h2>Etkinlik Notları</h2>
            <textarea value={notes} onChange={e => changeNotes(e.target.value)} placeholder="Notlar…" aria-label="Etkinlik notları" />
            <small>{message}</small>
          </div>
          <div className="event-count-card event-count-card--blue"><span>Aktif Başvuru</span><b>{event.activeApplications}</b></div>
          <div className="event-count-card event-count-card--green"><span>İlk Başvuru</span><b>{event.firstApplications}</b></div>
          <div className="event-tasks-card">
            <h2>Etkinlik Görev Takibi</h2>
            <div>{event.tasks.map(task => <label key={task.id} className={task.completed ? 'completed' : ''}>
              <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task)} />
              <span>{task.title}</span>
            </label>)}</div>
          </div>
        </section>

        <aside className="event-applications-card">
          <h2>Son Yapılan Başvurular</h2>
          <div className="event-application-list">{event.applications.slice(0, 13).map(application => <button type="button" key={application.id} onClick={() => { window.location.hash = `profile/${application.volunteerId}`; }}>
            <b>{application.volunteerCode || `#${String(application.volunteerId).padStart(5, '0')}`}</b><span>{application.name}</span>
          </button>)}</div>
          {!event.applications.length && <p>Henüz başvuru yok.</p>}
          <button className="event-view-all" type="button" onClick={() => setVolunteersOpen(true)}>Tümünü Görüntüle</button>
        </aside>
        {reportOpen && <EventReportDialog event={event} onClose={() => setReportOpen(false)} />}
        {volunteersOpen && <EventVolunteersDialog event={event} onClose={() => setVolunteersOpen(false)} />}
      </main>}
    </div>
  </div>;
}

function EventVolunteersDialog({ event, onClose }) {
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLocaleLowerCase('tr-TR');
  const volunteers = event.applications.filter(item => {
    const code = item.volunteerCode || `#${String(item.volunteerId).padStart(5, '0')}`;
    return !normalizedSearch || item.name.toLocaleLowerCase('tr-TR').includes(normalizedSearch) || code.toLocaleLowerCase('tr-TR').includes(normalizedSearch);
  });

  useEffect(() => {
    const closeOnEscape = keyboardEvent => keyboardEvent.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="event-report-overlay" role="presentation" onMouseDown={onClose}>
    <section className="event-volunteers-dialog" role="dialog" aria-modal="true" aria-labelledby="event-volunteers-title" onMouseDown={dialogEvent => dialogEvent.stopPropagation()}>
      <header><div><small>ETKİNLİK GÖNÜLLÜLERİ</small><h2 id="event-volunteers-title">{event.name}</h2><p>{event.activeApplications} aktif gönüllü</p></div><button type="button" onClick={onClose} aria-label="Gönüllü listesini kapat">×</button></header>
      <div className="event-volunteer-search"><span>⌕</span><input value={search} onChange={inputEvent => setSearch(inputEvent.target.value)} placeholder="Gönüllü adı veya numarası ara…" /></div>
      <div className="event-volunteer-table">
        <div className="event-volunteer-table__head"><span>Gönüllü No</span><span>Ad Soyad</span><span>İşlem</span></div>
        {volunteers.map(volunteer => <div className="event-volunteer-row" key={volunteer.volunteerId}>
          <strong>{volunteer.volunteerCode || `#${String(volunteer.volunteerId).padStart(5, '0')}`}</strong><span>{volunteer.name}</span>
          <button type="button" onClick={() => { window.location.hash = `profile/${volunteer.volunteerId}`; onClose(); }}>Profili Gör</button>
        </div>)}
        {!volunteers.length && <p className="event-volunteer-empty">Aramanızla eşleşen gönüllü bulunamadı.</p>}
      </div>
    </section>
  </div>;
}

const emptyReport = { summary: '', achievements: '', issues: '', managerEvaluation: '' };

function EventReportDialog({ event, onClose }) {
  const [report, setReport] = useState(emptyReport);
  const [reportEvent, setReportEvent] = useState(null);
  const [state, setState] = useState('loading');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const closeOnEscape = keyboardEvent => keyboardEvent.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    getEventReport(event.id).then(result => {
      setReport({ ...emptyReport, ...result.report });
      setReportEvent(result.event);
      setState('ready');
    }).catch(() => { setFeedback('Rapor bilgileri alınamadı.'); setState('error'); });
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [event.id, onClose]);

  const update = (field, value) => setReport(current => ({ ...current, [field]: value }));
  const submit = async submitEvent => {
    submitEvent.preventDefault(); setFeedback('Kaydediliyor…');
    try {
      const saved = await saveEventReport(event.id, report);
      setReport({ ...emptyReport, ...saved }); setFeedback('Etkinlik raporu kaydedildi.');
    } catch (error) {
      setFeedback(error.response?.data?.error || 'Rapor kaydedilemedi.');
    }
  };

  return <div className="event-report-overlay" role="presentation" onMouseDown={onClose}>
    <section className="event-report-dialog" role="dialog" aria-modal="true" aria-labelledby="event-report-title" onMouseDown={dialogEvent => dialogEvent.stopPropagation()}>
      <header><div><small>ETKİNLİK RAPORU</small><h2 id="event-report-title">{event.name}</h2></div><button type="button" onClick={onClose} aria-label="Raporu kapat">×</button></header>
      {state === 'loading' && <div className="event-report-loading">Rapor yükleniyor…</div>}
      {state !== 'loading' && <form onSubmit={submit}>
        <div className="event-report-stats">
          <div><small>Etkinlik Tarihi</small><strong>{formatDate(reportEvent?.date || event.date)}</strong></div>
          <div><small>Katılımcı</small><strong>{reportEvent?.participantCount ?? event.activeApplications}</strong></div>
          <div><small>Hedef</small><strong>{reportEvent?.target || '—'}</strong></div>
          <div><small>Durum</small><strong>{reportEvent?.completed ? 'Tamamlandı' : 'Devam Ediyor'}</strong></div>
        </div>
        <label>Rapor Özeti<textarea rows="4" value={report.summary} onChange={e => update('summary', e.target.value)} placeholder="Etkinliğin genel değerlendirmesini yazın…" /></label>
        <div className="event-report-fields">
          <label>Kazanımlar<textarea rows="4" value={report.achievements} onChange={e => update('achievements', e.target.value)} placeholder="Etkinliğin sağladığı kazanımlar…" /></label>
          <label>Yaşanan Sorunlar<textarea rows="4" value={report.issues} onChange={e => update('issues', e.target.value)} placeholder="Varsa yaşanan sorunlar…" /></label>
        </div>
        <label>Yönetici Değerlendirmesi<textarea rows="4" value={report.managerEvaluation} onChange={e => update('managerEvaluation', e.target.value)} placeholder="Yönetici değerlendirmesi ve öneriler…" /></label>
        <footer><span className={state === 'error' ? 'error' : ''}>{feedback}</span><button type="button" onClick={onClose}>Vazgeç</button><button type="submit">Raporu Kaydet</button></footer>
      </form>}
    </section>
  </div>;
}
