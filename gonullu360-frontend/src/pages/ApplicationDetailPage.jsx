import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { getApplication, updateApplicationStatus } from '../services/api';

export default function ApplicationDetailPage() {
  const id = window.location.hash.match(/^#application\/(\d+)$/)?.[1];
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return setError('Başvuru numarası bulunamadı.');
    getApplication(id).then(setApplication).catch(() => setError('Başvuru bilgileri yüklenemedi.'));
  }, [id]);

  const changeStatus = async (status) => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateApplicationStatus(id, status);
      if (updated.volunteerId) {
        localStorage.setItem('selectedVolunteerId', String(updated.volunteerId));
        window.location.hash = `#profile/${updated.volunteerId}`;
        return;
      }
      setApplication(current => ({ ...current, status: updated.status }));
    } catch (requestError) {
      setError(requestError.response?.status === 401
        ? 'Bu işlem için yönetici oturumunun açılması gerekiyor.'
        : 'Başvuru durumu güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  return <div style={styles.page}>
    <Sidebar />
    <div style={styles.content}>
      <Navbar />
      <main style={styles.main}>
        <div style={styles.toolbar}>
          <div><h1 style={styles.title}>Başvuru Detayı</h1><p style={styles.subtitle}>Başvuru bilgilerini ve mevcut durumunu inceleyebilirsiniz.</p></div>
          <button style={styles.back} onClick={() => { window.location.hash = '#volunteers'; }}>← Gönüllü Listesine Dön</button>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        {!application && !error && <div style={styles.card}>Başvuru yükleniyor...</div>}
        {application && <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.avatar}>{initials(application.name)}</div>
            <div><h2 style={{margin:'0 0 8px'}}>{application.name}</h2><StatusBadge status={application.status} /></div>
            <strong style={styles.code}>#{String(application.id).padStart(5, '0')}</strong>
          </div>
          <div style={styles.grid}>
            <Info label="Başvuru Tarihi" value={formatDate(application.applicationDate)} />
            <Info label="Eğitim Düzeyi" value={application.education} />
            <Info label="Şehir" value={application.city} />
            <Info label="Cinsiyet" value={application.gender} />
            <Info label="Yaş" value={`${application.age} yaşında`} />
            <Info label="Başvuru Durumu" value={application.status} />
            <Info label="Telefon" value={application.phone} />
            <Info label="E-posta" value={application.email} />
            <Info label="Adres" value={application.address} />
          </div>
          <section style={styles.section}><h3>İlgi Alanları</h3><div style={styles.tags}>{application.interests?.map(item => <span key={item} style={styles.tag}>{item}</span>)}</div></section>
          <section style={styles.section}><h3>Ön Yazı</h3><p style={styles.paragraph}>{application.coverLetter || 'Ön yazı eklenmemiş.'}</p></section>
          {application.evaluationNote && <section style={styles.section}><h3>Değerlendirme Notu</h3><p style={styles.paragraph}>{application.evaluationNote}</p></section>}
          {application.status === 'İşlem Bekliyor' && <div style={styles.actions}>
            <button disabled={saving} style={styles.rejectButton} onClick={() => changeStatus('Reddedildi')}>Reddet</button>
            <button disabled={saving} style={styles.acceptButton} onClick={() => changeStatus('Aktif Gönüllü')}>Kabul Et</button>
          </div>}
          {application.status === 'Reddedildi' && <div style={styles.actions}>
            <span style={{...styles.notice,margin:0,flex:1}}>Bu başvuru reddedilmiş.</span>
            <button disabled={saving} style={styles.reviewButton} onClick={() => changeStatus('İşlem Bekliyor')}>Yeniden Değerlendir</button>
          </div>}
        </div>}
      </main>
    </div>
  </div>;
}

function Info({ label, value }) { return <div style={{...styles.info,minWidth:0}}><small style={styles.label}>{label}</small><strong style={{maxWidth:'100%',overflowWrap:'anywhere',wordBreak:'break-word',lineHeight:1.35}}>{value || 'Eklenmemiş'}</strong></div>; }
function StatusBadge({ status }) { const rejected=status==='Reddedildi'; return <span style={{...styles.badge,background:rejected?'#ffe1e1':'#fff1c9',color:rejected?'#d63031':'#a66a00'}}>{status}</span>; }
function initials(name) { return name.split(' ').map(item => item[0]).join('').slice(0,2).toLocaleUpperCase('tr-TR'); }
function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}.${month}.${year}`;
}

const styles = {
  page:{display:'flex',minHeight:'100vh',background:'#f5f6fa'},content:{flex:1,minWidth:0},main:{padding:'34px 38px'},toolbar:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20,marginBottom:24},title:{margin:0,color:'#262626'},subtitle:{margin:'7px 0 0',color:'#7d858e'},back:{padding:'9px 14px',border:'1px solid #ddd',borderRadius:8,background:'#fff',cursor:'pointer'},card:{padding:28,border:'1px solid #e8ebee',borderRadius:16,background:'#fff',boxShadow:'0 5px 18px rgba(0,0,0,.05)'},header:{display:'flex',alignItems:'center',gap:16,paddingBottom:24,borderBottom:'1px solid #eee'},avatar:{width:64,height:64,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:'#e2f7ef',color:'#00966b',fontWeight:700,fontSize:20},code:{marginLeft:'auto',fontSize:22,color:'#777'},badge:{display:'inline-block',padding:'6px 11px',borderRadius:18,fontSize:12},grid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16,marginTop:24},info:{padding:17,border:'1px solid #edf0f3',borderRadius:10,display:'flex',flexDirection:'column',gap:7},label:{color:'#8a9199'},notice:{marginTop:24,padding:15,borderRadius:10,background:'#fff7dd',color:'#866100'},error:{padding:20,borderRadius:10,background:'#fff1f0',color:'#b42318'},actions:{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:12,marginTop:24},rejectButton:{padding:'11px 22px',border:'1px solid #e74c3c',borderRadius:8,background:'#fff',color:'#d63031',cursor:'pointer',fontWeight:600},acceptButton:{padding:'11px 22px',border:0,borderRadius:8,background:'#00b878',color:'#fff',cursor:'pointer',fontWeight:600},reviewButton:{padding:'11px 18px',border:'1px solid #d99b00',borderRadius:8,background:'#fff',color:'#9b6b00',cursor:'pointer',fontWeight:600},section:{marginTop:24,paddingTop:8},tags:{display:'flex',flexWrap:'wrap',gap:8},tag:{padding:'7px 11px',borderRadius:16,background:'#e8f8f2',color:'#008c65',fontSize:12},paragraph:{padding:16,border:'1px solid #edf0f3',borderRadius:10,color:'#555',lineHeight:1.6,margin:0}
};
