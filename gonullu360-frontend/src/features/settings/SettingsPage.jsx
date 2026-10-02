import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { useAuth } from '../auth/AuthProvider';
import SettingsIcon from './SettingsIcon';
import { getSettingsPanels } from './settingsPanels';
import { getAccountProfile } from './profileApi';
import './SettingsPage.css';

const profileEditUrl = '#settings/profile-edit';

export function SettingsShell({ title = 'Ayarlar', children }) {
  return (
    <div className="settings-layout">
      <Sidebar />
      <div className="settings-content">
        <Navbar />
        <main className="settings-main">
          <h1 className="settings-title">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}

function ProfileCard() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError('');
    getAccountProfile()
      .then(data => { if (active) setProfile(data); })
      .catch(() => { if (active) setError('Profil bilgileri yüklenemedi.'); });
    return () => { active = false; };
  }, [attempt]);

  return (
    <aside className="settings-profile" aria-label="Profil bilgileri">
      <a className="settings-profile-edit" href={profileEditUrl} aria-label="Profili düzenle">
        <SettingsIcon name="edit" size={25} />
      </a>
      {error ? (
        <div>
          <p role="alert">{error}</p>
          <button onClick={() => setAttempt(value => value + 1)}>Tekrar dene</button>
        </div>
      ) : !profile ? (
        <p role="status">Profil yükleniyor…</p>
      ) : (
        <>
          <div className="settings-profile-identity">
            <div className="settings-avatar" aria-hidden="true">
              {profile.photo
                ? <img src={profile.photo} alt="" />
                : (profile.name || '?').split(' ').map(part => part[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h2>{profile.organization?.name || profile.name}</h2>
              <p>{profile.jobTitle || 'Hesap Bilgileri'}</p>
            </div>
          </div>
          <h3>Hakkında</h3>
          <ul className="settings-contact">
            <li><SettingsIcon name="shield" /><span>{profile.name}</span></li>
            <li><SettingsIcon name="phone" /><span>Telefon: <strong>{profile.phone || '—'}</strong></span></li>
            <li><SettingsIcon name="mail" /><span>Email: <strong>{profile.email}</strong></span></li>
            <li><SettingsIcon name="laptop" /><span>Website: <strong>{profile.website || '—'}</strong></span></li>
          </ul>
          {profile.about && <p className="settings-profile-about">{profile.about}</p>}
          <div className="settings-address">
            <h3>Adres</h3>
            <div><SettingsIcon name="pin" /><span>Adres: <strong>{profile.address || '—'}</strong></span></div>
          </div>
        </>
      )}
    </aside>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <SettingsShell>
      <div className="settings-grid">
        <div className="settings-left">
          <section className="settings-general" aria-labelledby="general-settings-title">
            <h2 id="general-settings-title">Genel Ayarlar</h2>
            <div className="settings-row">
              <SettingsIcon name="profile" /><span>Profil</span>
              <a className="settings-edit-link" href={profileEditUrl}>Düzenle</a>
            </div>
            <div className="settings-row">
              <SettingsIcon name="globe" />
              <label htmlFor="settings-language">Dil</label>
              <select id="settings-language" value="tr" onChange={() => {}}>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>
            <button className="settings-row" type="button"><SettingsIcon name="shield" /><span>Güvenlik &amp; Yedekleme</span></button>
            <a className="settings-row" href="#settings/notifications"><SettingsIcon name="bell" /><span>Bildirim Ayarları</span></a>
            <button className="settings-row" type="button"><SettingsIcon name="integration" /><span>API ve Entegrasyon Ayarları</span></button>
          </section>
          {getSettingsPanels(user).map(({ id, Component }) => <Component key={id} />)}
        </div>
        <ProfileCard />
      </div>
    </SettingsShell>
  );
}
