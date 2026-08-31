import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./features/auth/AuthProvider', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
    logout: jest.fn(),
  }),
}));

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
