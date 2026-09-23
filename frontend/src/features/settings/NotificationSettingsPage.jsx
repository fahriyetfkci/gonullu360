import { useState } from 'react';
import { SettingsShell } from './SettingsPage';
import './NotificationSettingsPage.css';

// Stable preference keys allow these controls to be connected to an API later.
const notificationGroups = [
  {
    id: 'events', title: 'Etkinlik Türleri', items: [
      { id: 'eventCreated', label: 'Sistemde yeni bir etkinlik oluşturulduğunda haberdar olun.', enabled: true },
      { id: 'eventReminder', label: 'Etkinlik başlamadan önce zamanında bir hatırlatma alın.', enabled: false },
      { id: 'taskAssigned', label: 'Size veya ekibinize yeni bir görev atandığında bildirim alın.', enabled: false },
    ],
  },
  {
    id: 'reports', title: 'Rapor ve Veri Bildirimleri', items: [
      { id: 'reportReady', label: 'Haftalık veya aylık raporlar tamamlandığında size bilgi verilsin.', enabled: true },
      { id: 'dataRequestReviewed', label: 'Veri giriş taleplerinin onaylandığını veya reddedildiğini öğrenin.', enabled: false },
    ],
  },
  {
    id: 'system', title: 'Sistem Bildirimleri', items: [
      { id: 'systemUpdated', label: 'Platformdaki sistem güncellemeleri hakkında bilgi alın.', enabled: false },
      { id: 'accountLogin', label: 'Hesabınıza giriş yapıldığında bildirilir.', enabled: true },
    ],
  },
];

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState(() => Object.fromEntries(
    notificationGroups.flatMap(group => group.items.map(item => [item.id, item.enabled]))
  ));

  return <SettingsShell>
    <div className="notification-settings">
      <div className="notification-settings-heading"><h2>Bildirim Ayarları</h2></div>
      <section className="notification-settings-card" aria-labelledby="notification-types-title">
        <h3 id="notification-types-title">Bildirim Türleri</h3>
        {notificationGroups.map(group => <fieldset className="notification-settings-group" key={group.id}>
          <legend>{group.title}</legend>
          <div className="notification-settings-options">
            {group.items.map(item => <label className="notification-settings-option" key={item.id}>
              <span>{item.label}</span>
              <input type="checkbox" role="switch" checked={preferences[item.id]} onChange={event => {
                const enabled = event.target.checked;
                setPreferences(current => ({ ...current, [item.id]: enabled }));
              }} />
            </label>)}
          </div>
        </fieldset>)}
      </section>
    </div>
  </SettingsShell>;
}
