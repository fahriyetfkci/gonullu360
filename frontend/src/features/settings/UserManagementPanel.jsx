import { useState } from 'react';
import SettingsIcon from './SettingsIcon';

const exampleUsers = [
  { id: 'example-admin', name: 'Enes Acar', email: 'enes.acar@example.com', role: 'ADMIN' },
  { id: 'example-member', name: 'Onur Özbek', email: 'onur.ozbek@example.com', role: 'LIMITED' },
];

export default function UserManagementPanel() {
  const [users, setUsers] = useState(exampleUsers);
  return <section className="settings-users" aria-labelledby="settings-users-title">
    <table>
      <thead><tr><th id="settings-users-title" scope="col">Kullanıcı Yönetimi</th><th scope="col">Rol</th></tr></thead>
      <tbody>{users.map(user => <tr key={user.id}>
        <td><strong>{user.name}</strong><small>{user.email}</small></td>
        <td><div className={`settings-role settings-role--${user.role.toLowerCase()}`}><SettingsIcon name="user" size={17} />
          <select aria-label={`${user.name} rolü`} value={user.role} onChange={event => {
            const role = event.target.value;
            setUsers(current => current.map(item => item.id === user.id ? { ...item, role } : item));
          }}><option value="ADMIN">Admin</option><option value="LIMITED">Sınırlı Yetki</option></select>
        </div></td>
      </tr>)}</tbody>
    </table>
    <p className="settings-demo-note">Örnek kullanıcılar · Rol değişiklikleri yalnızca bu önizleme için geçerlidir.</p>
  </section>;
}
