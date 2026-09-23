import UserManagementPanel from './UserManagementPanel';

// Add future panels here. Each panel can also check organization membership
// through isVisible(user); authorization for real mutations belongs on the API.
export const settingsPanels = [
  { id: 'user-management', isVisible: user => user?.role === 'ADMIN', Component: UserManagementPanel },
];

export function getSettingsPanels(user) {
  return settingsPanels.filter(panel => panel.isVisible(user));
}
