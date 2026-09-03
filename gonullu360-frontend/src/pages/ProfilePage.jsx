import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { getVolunteerProfile, updateVolunteerProfile } from '../services/api';
import './ProfilePage.css';
import './ManagerNote.css';

const sectionNames = ['Başvurular', 'Eğitim Bilgileri', 'Etkinlik Katılımı', 'İletişim Bilgileri', 'Belgeler', 'Ön Yazı', 'CV', 'Görevler'];

export default function ProfilePage() {
  const hashId = window.location.hash.match(/^#profile\/(\d+)$/)?.[1];
  const volunteerId = hashId || localStorage.getItem('selectedVolunteerId');
  const [profile, setProfile] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [error, setError] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState('');

  useEffect(() => {
    if (!volunteerId) {
      setError('Görüntülenecek gönüllü seçilmedi.');
      return;
    }
    getVolunteerProfile(volunteerId)
      .then(data => {
        setProfile(data);
        setNoteDraft(data.managerNote || '');
      })
      .catch(() => setError('Gönüllü profili yüklenemedi.'));
  }, [volunteerId]);

  const persistManagerNote = async value => {
    setNoteSaving(true);
    setNoteError('');
    try {
      const updatedProfile = await updateVolunteerProfile(volunteerId, { managerNote: value });
      setProfile(updatedProfile);
      setNoteDraft(updatedProfile.managerNote || '');
      setEditingNote(false);
    } catch (requestError) {
      setNoteError(requestError.response?.status === 401
        ? 'Yönetici notunu kaydetmek için yönetici oturumu gerekiyor.'
        : requestError.response?.data?.error || 'Yönetici notu kaydedilemedi.');
    } finally {
      setNoteSaving(false);
    }
  };

  const deleteManagerNote = () => {
    if (window.confirm('Yönetici notunu silmek istediğinize emin misiniz?')) persistManagerNote(null);
  };

  if (error) return <PageShell><div className="profile-message">{error}<BackButton /></div></PageShell>;
  if (!profile) return <PageShell><div className="profile-message">Profil yükleniyor...</div></PageShell>;

  return (
    <PageShell>
      <main className="profile-main">
        <div className="profile-toolbar">
          <div className="profile-status"><span className={profile.active ? '' : 'passive'} />{profile.status}</div>
          <BackButton />
        </div>
        <div className="profile-layout">
          <section className="profile-left-column">
            <div className="profile-section-buttons">
              {sectionNames.map(name => <button key={name} className={activeSection === name ? 'active' : ''} onClick={() => setActiveSection(name)}>{name}</button>)}
            </div>
            <h3>Son Katıldığı Etkinlik</h3>
            <div className="profile-event-box">{profile.lastEvent ? <><span>#E{profile.lastEvent.id}</span>{profile.lastEvent.name}</> : 'Henüz etkinlik katılımı yok'}</div>
            <h3>İlgi Alanları</h3>
            <div className="profile-interests">{profile.interests.length ? profile.interests.map(item => <span key={item}>{item}</span>) : <small>İlgi alanı eklenmemiş</small>}</div>
          </section>

          <section className="profile-center-column">
            {activeSection ? <DetailPanel section={activeSection} profile={profile} onClose={() => setActiveSection(null)} /> : <>
              <h1>{profile.name}</h1>
              <div className="profile-location"><span>{profile.city}</span>{profile.department && <p>#{profile.department}</p>}</div>
              <div className="profile-photo-area">{profile.photoUrl ? <img src={profile.photoUrl} alt={profile.name} /> : <div>👤<small>Profil Fotoğrafı</small></div>}</div>
              <div className="profile-id">{profile.volunteerCode}</div>
              <small>Doğum Tarihi</small>
              <div className="profile-birth-value">{profile.birthDate ? `${formatDate(profile.birthDate)} (${profile.age} yaşında)` : `${profile.age} yaşında`}</div>
            </>}
          </section>

          <section className="profile-right-column">
            <div className="profile-score-row"><ScoreCard title="Gönüllülük Puanı" value={profile.scores.volunteering} target={profile.targets?.volunteering ?? 80} color="#00b894" /><ScoreCard title="Katılım Skoru" value={profile.scores.participation} target={profile.targets?.participation ?? 70} color="#049bb8" /></div>
            <div className="profile-small-card"><h3>Son Katıldığı Etkinlik</h3><strong>{profile.lastEvent ? formatDate(profile.lastEvent.date) : '—'}</strong></div>
            <div className="profile-manager-note">
              <div className="profile-note-header">
                <h3>Yönetici Notu</h3>
                {!editingNote && <button type="button" onClick={() => { setNoteDraft(profile.managerNote || ''); setNoteError(''); setEditingNote(true); }}>Düzenle</button>}
              </div>
              {editingNote ? (
                <div className="profile-note-editor">
                  <textarea value={noteDraft} onChange={event => setNoteDraft(event.target.value)} placeholder="Yönetici notunu yazın..." rows="5" />
                  {noteError && <p className="profile-note-error">{noteError}</p>}
                  <div className="profile-note-actions">
                    <button type="button" className="primary" disabled={noteSaving} onClick={() => persistManagerNote(noteDraft.trim() || null)}>{noteSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                    <button type="button" disabled={noteSaving} onClick={() => { setNoteDraft(profile.managerNote || ''); setNoteError(''); setEditingNote(false); }}>İptal</button>
                    {profile.managerNote && <button type="button" className="danger" disabled={noteSaving} onClick={deleteManagerNote}>Notu Sil</button>}
                  </div>
                </div>
              ) : <div className="profile-note-content">{profile.managerNote || 'Yönetici notu eklenmemiş.'}</div>}
              {!editingNote && profile.managerNote && profile.managerNoteMeta && (
                <div className="profile-note-meta">
                  {formatDateTime(profile.managerNoteMeta.updatedAt)} · {profile.managerNoteMeta.authorName || 'Yönetici'}
                  {profile.managerNoteMeta.authorRole && ` · ${formatRole(profile.managerNoteMeta.authorRole)}`}
                </div>
              )}
              {!editingNote && noteError && <p className="profile-note-error">{noteError}</p>}
            </div>
          </section>
        </div>
      </main>
    </PageShell>
  );
}

function PageShell({ children }) { return <div className="profile-page"><Sidebar /><div className="profile-page-content"><Navbar />{children}</div></div>; }
function BackButton() { return <button className="profile-back" onClick={() => { window.location.hash = '#volunteers'; }}>← Gönüllü Listesine Dön</button>; }
function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}.${month}.${year}`;
}
function formatDateTime(value) { if (!value) return 'Tarih belirtilmemiş'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('tr-TR'); }
function formatRole(role) { return ['yönetici', 'admin'].includes(String(role || '').toLocaleLowerCase('tr-TR')) ? 'Yönetici' : role === 'VOLUNTEER' ? 'Gönüllü' : role; }

function ScoreCard({ title, value, target, color }) {
  return <div className="profile-score-card"><h3>{title}</h3><div className="profile-score-circle" style={{ background: `conic-gradient(${color} ${value * 3.6}deg, #edf1f4 0deg)` }}><div><strong>{value}%</strong></div></div><small>Hedef <b>{target}%</b></small></div>;
}

function DetailPanel({ section, profile, onClose }) {
  const rows = {
    'Başvurular': [['Başvuru No', profile.volunteerCode], ['Başvuru Tarihi', formatDate(profile.joinedAt)], ['Durum', profile.status]],
    'Eğitim Bilgileri': profile.educations?.length
      ? profile.educations.flatMap((education, index) => [
          [`${index + 1}. Eğitim`, education.level],
          [`${index + 1}. Okul`, education.school],
          [`${index + 1}. Bölüm`, education.department || 'Belirtilmemiş'],
          [`${index + 1}. Tarih`, `${education.startYear || '—'} – ${education.current ? 'Devam ediyor' : education.endYear || '—'}`],
        ])
      : [['Eğitim Düzeyi', profile.education], ['Durum', 'Detaylı eğitim kaydı eklenmemiş']],
    'Etkinlik Katılımı': [['Toplam Katılım', `${profile.summary.eventCount} etkinlik`], ['Katılım Skoru', `%${profile.scores.participation}`], ['Son Etkinlik', profile.lastEvent?.name || 'Henüz yok']],
    'İletişim Bilgileri': [['Telefon', profile.contact.phone || 'Eklenmemiş'], ['E-posta', profile.contact.email || 'Eklenmemiş'], ['Adres', profile.contact.address || profile.city]],
    'Belgeler': [['Belge Sayısı', profile.summary.documentCount]],
    'Ön Yazı': [['Ön Yazı', profile.coverLetter || 'Ön yazı eklenmemiş']],
    'CV': [['Durum', 'CV eklenmemiş']],
    'Görevler': [['Görev Sayısı', profile.summary.taskCount]],
  }[section] || [];
  return <div className="profile-detail"><header><h2>{section}</h2><button onClick={onClose}>×</button></header>{rows.map(([label, value]) => <div className="profile-detail-row" key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>;
}
