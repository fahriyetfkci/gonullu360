import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { getEventDetail, getEventReport, saveEventNotes, saveEventReport, setEventTaskCompleted } from '../services/api';
import './EventDetailPage.css';
import './EventPosterThemes.css';
import './EventVolunteersDialog.css';

const formatDate = value => new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));

function Poster({ event }) {
  if (event.imageUrl) return <img className="event-poster" src={event.imageUrl} alt={`${event.name} afişi`} />;
  const normalizedName = event.name.toLocaleLowerCase('tr-TR');
  const themes = [
    { words: ['iletişim atölyesi'], eyebrow: 'SÖZÜNÜ ETKİYE DÖNÜŞTÜR', icon: '💬', message: 'Dinle, anlat ve güçlü bağlar kur.', colors: ['#24506f', '#4b91a8', '#dceff2'], accent: '#ffd166' },
    { words: ['fotoğrafçılık'], eyebrow: 'ANI YAKALA', icon: '📷', message: 'Kadrajını kur, hikâyeni görüntüyle anlat.', colors: ['#4b315f', '#9965a9', '#f0e0f3'], accent: '#ffc85a' },
    { words: ['medya eğitimi'], eyebrow: 'MESAJINI DOĞRU AKTAR', icon: '🎙️', message: 'Bilinçli içerikle güvenilir iletişim kur.', colors: ['#713451', '#c26f8d', '#f8e2e9'], accent: '#ffe075' },
    { words: ['saha koordinasyon'], eyebrow: 'SAHADA UYUM, SONUÇTA BAŞARI', icon: '🧭', message: 'Planla, koordine et ve birlikte tamamla.', colors: ['#374b63', '#718aa1', '#e3ebf1'], accent: '#f8c85a' },
    { words: ['afet farkındalık'], eyebrow: 'AFETE HAZIR OL', icon: '🛟', message: 'Riskleri tanı, doğru adımla hayat kurtar.', colors: ['#9a3d27', '#e1764d', '#ffead1'], accent: '#ffffff' },
    { words: ['ilk yardım'], eyebrow: 'DOĞRU MÜDAHALE HAYAT KURTARIR', icon: '⛑️', message: 'Bilgini tazele, acil durumda hazır ol.', colors: ['#a62532', '#e6585f', '#ffe5e1'], accent: '#ffffff' },
    { words: ['kan bağışı'], eyebrow: 'BİR BAĞIŞ, ÜÇ UMUT', icon: '🩸', message: 'Hayata uzanan iyilik zincirine katıl.', colors: ['#8f1d2c', '#e4545c', '#ffe6e2'], accent: '#ffffff' },
    { words: ['çevre temizliği'], eyebrow: 'TEMİZ BİR ÇEVRE İÇİN', icon: '♻️', message: 'Yaşadığın yere sahip çık, değişimi başlat.', colors: ['#17684f', '#50a878', '#e2f4e7'], accent: '#f2ca45' },
    { words: ['fidan dikim'], eyebrow: 'GELECEĞE NEFES OL', icon: '🌱', message: 'Diktiğin her fidan yarına umut olsun.', colors: ['#35652d', '#75a957', '#eaf3cf'], accent: '#ffe178' },
    { words: ['yetim dayanışma'], eyebrow: 'SEVGİYLE YANINDA OL', icon: '🫶', message: 'Birlikte güçlenen umutlara destek ver.', colors: ['#285f86', '#76afd2', '#dfeef8'], accent: '#7dbb3d' },
    { words: ['ramazan yardım'], eyebrow: 'RAMAZAN PAYLAŞMAKTIR', icon: '🌙', message: 'Bereketi ve iyiliği birlikte çoğalt.', colors: ['#284f58', '#5b9185', '#e4eee0'], accent: '#f3cc65' },
    { words: ['kış yardımı'], eyebrow: 'SICAKLIĞI PAYLAŞ', icon: '🧣', message: 'Soğuk günlerde dayanışmayla yanında ol.', colors: ['#315878', '#6fa0c5', '#e2f0f8'], accent: '#ffcc67' },
    { words: ['sosyal yardım'], eyebrow: 'DAYANIŞMAYLA GÜÇLEN', icon: '📦', message: 'İhtiyaca ulaş, iyiliği yerinde büyüt.', colors: ['#6b4c33', '#b18458', '#f4e8d5'], accent: '#f6cb61' },
    { words: ['çocuk şenliği'], eyebrow: 'NEŞEYİ BİRLİKTE BÜYÜT', icon: '🎈', message: 'Her çocuğun gülümsemesine ortak ol.', colors: ['#7947a8', '#ec6ca9', '#fff0a8'], accent: '#ffffff' },
    { words: ['spor turnuvası'], eyebrow: 'ENERJİNİ PAYLAŞ', icon: '🏆', message: 'Takım ruhuyla aynı hedefe koş.', colors: ['#193d73', '#68b7ef', '#dff3ff'], accent: '#ffce36' },
    { words: ['teknoloji atölyesi'], eyebrow: 'GELECEĞİ TASARLA', icon: '💻', message: 'Fikrini geliştir, çözümünü hayata geçir.', colors: ['#263477', '#5f70df', '#dce7ff'], accent: '#69f0cf' },
    { words: ['kariyer atölyesi'], eyebrow: 'YOLUNU ŞİMDİ ÇİZ', icon: '💼', message: 'Güçlü yönlerini keşfet, geleceğine hazırlan.', colors: ['#254d69', '#568eaa', '#e1eef3'], accent: '#ffd166' },
    { words: ['stk zirvesi'], eyebrow: 'ORTAK AKILLA DAHA GÜÇLÜ', icon: '🌐', message: 'Deneyimi paylaş, sosyal etkiyi büyüt.', colors: ['#234c52', '#4f8b83', '#dcece5'], accent: '#f0c75e' },
    { words: ['gönüllülük semineri'], eyebrow: 'İYİLİĞE ADIM AT', icon: '🙋', message: 'Zamanını paylaş, topluma değer kat.', colors: ['#16665f', '#53aa99', '#e0f3eb'], accent: '#ffd45f' },
    { words: ['gönüllü buluşması'], eyebrow: 'AYNI AMAÇTA BULUŞUYORUZ', icon: '🤝', message: 'Deneyimini paylaş, dayanışmayı büyüt.', colors: ['#155c67', '#55ada5', '#e0f3eb'], accent: '#f2cf53' },
    { words: ['kahvaltı buluşması'], eyebrow: 'AYNI MASADA BULUŞ', icon: '☕', message: 'Sohbetle yakınlaş, yeni bağlar kur.', colors: ['#795238', '#c9925e', '#f8ead2'], accent: '#fff4c1' },
    { words: ['kitap tahlili'], eyebrow: 'OKU, DÜŞÜN, PAYLAŞ', icon: '📖', message: 'Farklı bakışlarla metnin izini sür.', colors: ['#46587a', '#8496bd', '#e9edf7'], accent: '#f0cb65' },
    { words: ['gençlik kampı'], eyebrow: 'KEŞFETMEYE HAZIR OL', icon: '🏕️', message: 'Doğada öğren, dostlukla güçlen.', colors: ['#355f42', '#82a767', '#f1e5bd'], accent: '#fff0a6' },
    { words: ['kültür gezisi'], eyebrow: 'GEÇMİŞİN İZİNDE', icon: '🏛️', message: 'Keşfet, öğren ve ortak mirası tanı.', colors: ['#694f3b', '#ad8867', '#f2e5d2'], accent: '#f7d477' },
  ];
  const poster = themes.find(theme => theme.words.some(word => normalizedName.includes(word))) || {
    eyebrow: 'BİRLİKTE HAREKETE GEÇ', icon: '✨', message: 'Gönüllülükle değişime değer kat.',
    colors: ['#155c67', '#55ada5', '#e0f3eb'], accent: '#f2cf53',
  };
  const posterStyle = {
    '--poster-dark': poster.colors[0], '--poster-mid': poster.colors[1],
    '--poster-light': poster.colors[2], '--poster-accent': poster.accent,
  };
  return <div className="event-poster event-poster--placeholder" style={posterStyle} aria-label={`${event.name} etkinlik afişi`}>
    <div className="poster-wave" />
    <small>{poster.eyebrow}</small>
    <strong>{event.name.toLocaleUpperCase('tr-TR')}</strong>
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
      <nav className="event-detail-backbar" aria-label="Etkinlik sayfasına dönüş">
        <a href="#events">← Etkinliklere Dön</a>
      </nav>
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
