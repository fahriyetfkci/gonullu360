import { fireEvent, render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthProvider';
import { getCurrentUser, loginWithPassword, refreshSession, logoutSession } from './services/authApi';

jest.mock('./services/authApi', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  clearAccessToken: jest.fn(), getCurrentUser: jest.fn(), loginWithPassword: jest.fn(),
  logoutSession: jest.fn(), refreshSession: jest.fn(),
}));

function SessionProbe() {
  const { status, user, login } = useAuth();
  return <><p>{status}:{user?.role}</p><button onClick={() => login('user@example.com', 'password')}>Login</button></>;
}

beforeEach(() => { jest.resetAllMocks(); });

test.each(['ADMIN', 'VOLUNTEER', 'STK_PRESIDENT'])('restores authenticated %s sessions', async role => {
  refreshSession.mockResolvedValue('token');
  getCurrentUser.mockResolvedValue({ id: 'user-1', role });
  render(<AuthProvider><SessionProbe /></AuthProvider>);
  expect(await screen.findByText(`authenticated:${role}`)).toBeInTheDocument();
});

test('non-admin can log in after an anonymous session', async () => {
  refreshSession.mockRejectedValue(new Error('No session'));
  getCurrentUser.mockResolvedValue({ id: 'user-1', role: 'VOLUNTEER' });
  loginWithPassword.mockResolvedValue('token');
  render(<AuthProvider><SessionProbe /></AuthProvider>);
  await screen.findByText('anonymous:');
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  expect(await screen.findByText('authenticated:VOLUNTEER')).toBeInTheDocument();
  expect(logoutSession).not.toHaveBeenCalled();
});

test('does not authenticate an empty user response', async () => {
  refreshSession.mockResolvedValue(null);
  getCurrentUser.mockResolvedValue(null);
  render(<AuthProvider><SessionProbe /></AuthProvider>);
  expect(await screen.findByText('anonymous:')).toBeInTheDocument();
});
