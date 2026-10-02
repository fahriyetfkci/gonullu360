import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { getEventOverview, getManagedEvents } from '../services/api';
import './EventOverviewPage.css';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });
const monthFormatter = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });
const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const HISTORY_PAGE_SIZE = 4;

function eventDate(event) {
  return new Date(event.startsAt || event.date);
}

function isPastEvent(event, now) {
  const end = new Date(event.endsAt || event.startsAt || event.date);
  return event.status === 'COMPLETED' || end < now;
}

function ParticipationRing({ distribution }) {
  const paintedRatio = 0.72;
  const gap = (100 - (100 * paintedRatio)) / 3;
  const segments = [
    { value: Math.min(100, Math.abs(distribution.comparedToPreviousMonth.percentage)), color: '#00c99a' },
    { value: distribution.continuing.percentage, color: '#7668e8' },
    { value: distribution.notContinuing.percentage, color: '#1689ef' },
  ];
  let offset = 2;
  return <svg className="participation-ring-graphic" viewBox="0 0 120 120" role="img" aria-label="Aylık gönüllü katılım dağılımı">
    <circle className="ring-track" cx="60" cy="60" r="48" pathLength="100" />
    {segments.map((segment, index) => {
      const startOffset = offset;
      const arcLength = segment.value * paintedRatio;
      offset += arcLength + gap;
      return <circle
        key={segment.color}
        className="ring-segment"
        cx="60"
        cy="60"
        r="48"
        pathLength="100"
        stroke={segment.color}
        strokeDasharray={`${arcLength} 100`}
        strokeDashoffset={-startOffset}
        data-segment={index}
      />;
    })}
  </svg>;
}

export default function EventOverviewPage() {
  const [events, setEvents] = useState([]);
  const [overview, setOverview] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    let active = true;
    Promise.all([getManagedEvents({ page: 1, limit: 100 }), getEventOverview()])
      .then(([result, overviewResult]) => {
        if (!active) return;
        setEvents(result?.items || []);
        setOverview(overviewResult);
        setStatus('ready');
      })
      .catch(requestError => {
        if (!active) return;
        setError(requestError.response?.data?.error?.message || requestError.response?.data?.error || 'Etkinlikler yüklenemedi.');
        setStatus('error');
      });
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => {
    const now = new Date();
    const past = events.filter(event => isPastEvent(event, now)).sort((a, b) => eventDate(b) - eventDate(a));
    const upcoming = events.filter(event => !isPastEvent(event, now) && event.status === 'SCHEDULED').sort((a, b) => eventDate(a) - eventDate(b));
    const participants = events.reduce((total, event) => total + Number(event.participantCount || 0), 0);
    const capacity = events.reduce((total, event) => total + Number(event.capacity || 0), 0);
    const participationRate = capacity ? Math.min(100, Math.round((participants / capacity) * 100)) : 0;
    return { past, upcoming, participants, participationRate };
  }, [events]);

  const participationDistribution = overview?.participationDistribution || {
    comparedToPreviousMonth: { count: 0, percentage: 0 },
    continuing: { count: 0, percentage: 0 },
    notContinuing: { count: 0, percentage: 0 },
  };

  const historyPageCount = Math.max(1, Math.ceil(summary.past.length / HISTORY_PAGE_SIZE));
  const currentHistoryPage = Math.min(historyPage, historyPageCount);
  const paginatedPastEvents = summary.past.slice(
    (currentHistoryPage - 1) * HISTORY_PAGE_SIZE,
    currentHistoryPage * HISTORY_PAGE_SIZE,
  );

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();
    const cells = [];
    for (let index = leadingDays - 1; index >= 0; index -= 1) cells.push({ day: previousMonthDays - index, muted: true, key: `previous-${index}` });
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayEvents = events.filter(event => {
        const date = eventDate(event);
        return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
      });
      cells.push({ day, events: dayEvents, key: `current-${day}` });
    }
    let nextDay = 1;
    while (cells.length < 42) cells.push({ day: nextDay, muted: true, key: `next-${nextDay++}` });
    return cells;
  }, [calendarDate, events]);

  const openDetail = id => { window.location.hash = `events/${id}`; };

  return <div className="event-overview-shell">
    <Sidebar />
    <div className="event-overview-content">
      <Navbar />
      <main className="event-overview-main">
        <div className="event-overview-heading">
          <div><span>ETKİNLİK YÖNETİMİ</span><h1>Etkinlikler</h1></div>
        </div>

        {status === 'loading' && <div className="event-overview-state" role="status">Etkinlikler yükleniyor…</div>}
        {status === 'error' && <div className="event-overview-state error" role="alert">{error}</div>}

        {status === 'ready' && <>
          <section className="event-summary-cards" aria-label="Etkinlik özeti">
            <article className="event-create-card" onClick={() => { window.location.hash = 'events/new'; }}>
              <span>✓</span><strong>Yeni Etkinlik Oluştur</strong>
            </article>
            <article><span>↗</span><div><small>Toplam Etkinlik</small><strong>{overview?.totalEvents ?? events.length}</strong></div></article>
            <article><span>↗</span><div><small>Aktif Gönüllü</small><strong>{overview?.activeVolunteers ?? 0}</strong></div></article>
            <article><span>↗</span><div><small>Gönüllü Aktif Katılımı</small><strong>%{overview?.activeVolunteerParticipationRate ?? 0}</strong></div></article>
          </section>

          <section className="event-overview-panels">
            <article className="event-overview-card participation-card">
              <h2>Katılım Oranı</h2>
              <div className="participation-content">
                <ParticipationRing distribution={participationDistribution} />
                <div className="participation-legend">
                  <span><i className={participationDistribution.comparedToPreviousMonth.direction === 'down' ? 'down' : 'up'}>{participationDistribution.comparedToPreviousMonth.direction === 'down' ? '↓' : participationDistribution.comparedToPreviousMonth.direction === 'steady' ? '→' : '↑'}</i><small>Geçen aya göre</small><strong>%{Math.abs(participationDistribution.comparedToPreviousMonth.percentage)}</strong></span>
                  <span><i className="steady">↑</i><small>Devam eden</small><strong>%{participationDistribution.continuing.percentage}</strong></span>
                  <span><i className="down">↓</i><small>Devam etmeyen</small><strong>%{participationDistribution.notContinuing.percentage}</strong></span>
                </div>
              </div>
            </article>

            <article className="event-overview-card calendar-card">
              <div className="calendar-heading">
                <h2>{monthFormatter.format(calendarDate)}</h2>
                <div>
                  <button type="button" aria-label="Önceki ay" onClick={() => setCalendarDate(date => new Date(date.getFullYear(), date.getMonth() - 1, 1))}>‹</button>
                  <button type="button" aria-label="Sonraki ay" onClick={() => setCalendarDate(date => new Date(date.getFullYear(), date.getMonth() + 1, 1))}>›</button>
                </div>
              </div>
              <div className="event-calendar">
                {weekDays.map(day => <span className="weekday" key={day}>{day}</span>)}
                {calendarDays.map(cell => <button type="button" className={`${cell.muted ? 'muted' : ''} ${cell.events?.length ? 'has-event' : ''}`} key={cell.key} onClick={() => cell.events?.[0] && openDetail(cell.events[0].id)} disabled={!cell.events?.length}>
                  <b>{cell.day}</b>
                  {cell.events?.length ? <span>{cell.events.slice(0, 3).map(event => <i key={event.id} style={{ background: event.groups?.[0]?.color || '#00ad87' }} />)}</span> : null}
                </button>)}
              </div>
            </article>

            <article className="event-overview-card upcoming-card">
              <h2>Yaklaşan Etkinlikler</h2>
              <div className="upcoming-list">
                {summary.upcoming.slice(0, 4).map((event, index) => <button type="button" key={event.id} onClick={() => openDetail(event.id)}>
                  <i style={{ background: event.groups?.[0]?.color || ['#ff385c', '#1689ef', '#f3a000', '#00ad87'][index % 4] }} />
                  <span>
                    <small>{shortDateFormatter.format(eventDate(event))} · {timeFormatter.format(eventDate(event))}</small>
                    <strong>{event.name}</strong>
                    <em>{event.address || 'Online etkinlik'}</em>
                    <mark style={{ color: event.groups?.[0]?.color || '#00ad87' }}>{event.groups?.[0]?.name || event.groupName || 'Genel'}</mark>
                  </span>
                </button>)}
                {!summary.upcoming.length && <p>Yaklaşan etkinlik bulunmuyor.</p>}
              </div>
            </article>
          </section>

          <section className="event-overview-bottom">
          <div className="event-history-card">
            <div className="event-history-heading"><div><h2>Geçmiş Etkinlikler</h2><p>{summary.past.length} etkinlik gerçekleştirildi</p></div></div>
            <div className="event-history-table-wrap">
              <table>
                <thead><tr><th>Etkinlik Adı</th><th>Katılım</th><th>Grup</th><th>Tarih</th><th aria-label="İşlemler" /></tr></thead>
                <tbody>
                  {paginatedPastEvents.map(event => <tr key={event.id} onClick={() => openDetail(event.id)}>
                    <td><strong>{event.name}</strong></td>
                    <td>{event.participantCount || 0}</td>
                    <td><span className="event-group-pill"><i style={{ background: event.groups?.[0]?.color || '#00ad87' }} />{event.groups?.[0]?.name || event.groupName || 'Genel'}</span></td>
                    <td>{dateFormatter.format(eventDate(event))}</td>
                    <td><button type="button" onClick={click => { click.stopPropagation(); openDetail(event.id); }} aria-label={`${event.name} detaylarını aç`}>Detayları Gör →</button></td>
                  </tr>)}
                </tbody>
              </table>
              {!summary.past.length && <div className="event-history-empty">Henüz geçmiş etkinlik bulunmuyor.</div>}
            </div>
            {summary.past.length > HISTORY_PAGE_SIZE && <nav className="event-history-pagination" aria-label="Geçmiş etkinlik sayfaları">
              <button type="button" className="pagination-arrow" onClick={() => setHistoryPage(page => Math.max(1, page - 1))} disabled={currentHistoryPage === 1} aria-label="Önceki sayfa">‹</button>
              <div>
                {Array.from({ length: historyPageCount }, (_, index) => index + 1).map(page => <button
                  type="button"
                  key={page}
                  className={page === currentHistoryPage ? 'active' : ''}
                  aria-current={page === currentHistoryPage ? 'page' : undefined}
                  onClick={() => setHistoryPage(page)}
                >{page}</button>)}
              </div>
              <button type="button" className="pagination-arrow" onClick={() => setHistoryPage(page => Math.min(historyPageCount, page + 1))} disabled={currentHistoryPage === historyPageCount} aria-label="Sonraki sayfa">›</button>
            </nav>}
          </div>
          <aside className="event-tasks-card">
            <h2>Genel Etkinlik Görevleri</h2>
            {['Katılımcı listesini kontrol et', 'Etkinlik alanını hazırla', 'Gönüllü bilgilendirmesini yap', 'Etkinlik raporunu tamamla'].map(task => <label key={task}><input type="checkbox" /><span>{task}</span></label>)}
          </aside>
          </section>
        </>}
      </main>
    </div>
  </div>;
}
