import { render, screen } from '@testing-library/react';
import App from './App';

let mockUserRole = 'ADMIN';

jest.mock('./services/client', () => {
  const client = { get: async () => ({ data: { data: [] } }) };
  return { apiClient: client, createApiClient: () => client };
});

jest.mock('./features/auth/AuthProvider', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'user-1', email: 'user@example.com', role: mockUserRole },
    logout: jest.fn(),
  }),
}));

afterEach(() => { mockUserRole = 'ADMIN'; });

test.each(['VOLUNTEER', 'STK_PRESIDENT'])('opens settings without admin management for %s', async role => {
  mockUserRole = role;
  window.location.hash = '#dashboard';
  render(<App />);
  expect(await screen.findByText('Genel Ayarlar')).toBeInTheDocument();
  expect(window.location.hash).toBe('#settings');
  expect(screen.queryByText('Kullanıcı Yönetimi')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Form Yönetimi/ })).not.toBeInTheDocument();
});

test('non-admin can open profile edit directly', async () => {
  mockUserRole = 'VOLUNTEER';
  window.location.hash = '#settings/profile-edit';
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Profili Düzenle' })).toBeInTheDocument();
  expect(window.location.hash).toBe('#settings/profile-edit');
});

jest.mock('./features/form-builder/services/formApi', () => ({
  getFormDraft: jest.fn().mockResolvedValue(null),
  getPublishedForm: jest.fn().mockResolvedValue(null),
  saveFormDraft: jest.fn(),
  publishFormDraft: jest.fn(),
  getFormApiErrorMessage: jest.fn(() => 'Form API hatası'),
}));

test('form yönetimi sayfasını açar', async () => {
  window.location.hash = '#forms';
  localStorage.clear();

  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Form Oluştur' })).toBeInTheDocument();
});
