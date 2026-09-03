import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import { AuthProvider } from './features/auth/AuthProvider';

vi.mock('./services/api', async importOriginal => ({
  ...(await importOriginal()),
  refreshSession: vi.fn().mockRejectedValue(new Error('no session')),
  getStoredUser: vi.fn(() => null),
}));

beforeEach(() => localStorage.clear());

test('oturum yokken yönetici giriş ekranını gösterir', async () => {
  render(<AuthProvider><App /></AuthProvider>);
  expect(await screen.findByRole('heading', { name: /yönetici girişi/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^giriş$/i })).toBeInTheDocument();
});
