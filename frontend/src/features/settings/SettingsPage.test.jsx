import { fireEvent, render, screen } from '@testing-library/react';
import SettingsPage from './SettingsPage';
import NotificationSettingsPage from './NotificationSettingsPage';
import { useAuth } from '../auth/AuthProvider';

jest.mock('../auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../../components/Sidebar', () => () => <nav />);
jest.mock('../../components/Navbar', () => () => <div />);
jest.mock('./profileApi', () => ({ getAccountProfile: () => new Promise(() => {}) }));

beforeEach(() => {
  useAuth.mockReturnValue({ user: { role: 'ADMIN' } });
  window.location.hash = '#settings';
});

test('admin can preview user roles', () => {
  render(<SettingsPage />);
  expect(screen.getByText('Kullanıcı Yönetimi')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Onur Özbek rolü'), { target: { value: 'ADMIN' } });
  expect(screen.getByLabelText('Onur Özbek rolü')).toHaveValue('ADMIN');
});

test.each(['VOLUNTEER', 'STK_PRESIDENT', undefined])('does not expose admin panel for %s', role => {
  useAuth.mockReturnValue({ user: role ? { role } : null });
  render(<SettingsPage />);
  expect(screen.queryByText('Kullanıcı Yönetimi')).not.toBeInTheDocument();
  expect(screen.getByText('Genel Ayarlar')).toBeInTheDocument();
});

test('edit links share a destination and notification settings have a separate route', () => {
  render(<SettingsPage />);
  expect(screen.getByRole('link', { name: 'Düzenle' })).toHaveAttribute('href', '#settings/profile-edit');
  expect(screen.getByRole('link', { name: 'Profili düzenle' })).toHaveAttribute('href', '#settings/profile-edit');
  expect(screen.getByRole('link', { name: 'Bildirim Ayarları' })).toHaveAttribute('href', '#settings/notifications');
  fireEvent.change(screen.getByLabelText('Dil'), { target: { value: 'en' } });
  expect(screen.getByLabelText('Dil')).toHaveValue('tr');
  fireEvent.click(screen.getByRole('button', { name: 'Güvenlik & Yedekleme' }));
  fireEvent.click(screen.getByRole('button', { name: 'API ve Entegrasyon Ayarları' }));
  expect(window.location.hash).toBe('#settings');
});

test('notification preferences toggle independently', () => {
  render(<NotificationSettingsPage />);
  const switches = screen.getAllByRole('switch');
  expect(switches).toHaveLength(7);
  expect(switches[0]).toBeChecked();
  expect(switches[1]).not.toBeChecked();
  fireEvent.click(switches[1]);
  expect(switches[1]).toBeChecked();
  expect(switches[0]).toBeChecked();
  fireEvent.click(switches[0]);
  expect(switches[0]).not.toBeChecked();
  expect(switches[1]).toBeChecked();
});
