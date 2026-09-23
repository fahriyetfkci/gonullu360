import { fireEvent, render, screen } from '@testing-library/react';
import ProfileEditPage from './ProfileEditPage';
import { getAccountProfile, saveAccountProfile } from './profileApi';

const mockUpdateSessionProfile = jest.fn();
jest.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ updateSessionProfile: mockUpdateSessionProfile }) }));
jest.mock('./SettingsPage', () => ({ SettingsShell: ({ children }) => <main>{children}</main> }));
jest.mock('./profileApi', () => ({ getAccountProfile: jest.fn(), saveAccountProfile: jest.fn() }));
const profile = { id: 'self', name: 'Test Kullanıcı', email: 'user@example.com', phone: '', jobTitle: '', about: '', address: '', website: '', photo: null, organization: { name: 'Test Vakfı' } };

beforeEach(() => { jest.clearAllMocks(); getAccountProfile.mockResolvedValue(profile); });

test('loads and persists all profile fields through the API', async () => {
  saveAccountProfile.mockResolvedValue({ ...profile, name: 'Yeni İsim', phone: '5551234567' });
  render(<ProfileEditPage />);
  expect(await screen.findByDisplayValue('Test Kullanıcı')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Ad Soyad'), { target: { value: 'Yeni İsim' } });
  fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '5551234567' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(await screen.findByText('Profiliniz kaydedildi.')).toBeInTheDocument();
  expect(saveAccountProfile).toHaveBeenCalledWith({ name: 'Yeni İsim', email: profile.email, phone: '5551234567', jobTitle: '', about: '', address: '', website: '', photo: null });
  expect(mockUpdateSessionProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'Yeni İsim' }));
});

test('keeps edits and shows server errors when saving fails', async () => {
  saveAccountProfile.mockRejectedValue({ response: { data: { error: { message: 'E-posta kullanımda.' } } } });
  render(<ProfileEditPage />);
  await screen.findByDisplayValue('Test Kullanıcı');
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'duplicate@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('E-posta kullanımda.');
  expect(screen.getByLabelText('Email')).toHaveValue('duplicate@example.com');
  expect(mockUpdateSessionProfile).not.toHaveBeenCalled();
});

test('allows retry after loading fails without submitting empty data', async () => {
  getAccountProfile.mockRejectedValueOnce(new Error('offline'));
  render(<ProfileEditPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Tekrar dene' }));
  expect(await screen.findByDisplayValue('Test Kullanıcı')).toBeInTheDocument();
  expect(saveAccountProfile).not.toHaveBeenCalled();
});

test('rejects unsupported photo uploads', async () => {
  render(<ProfileEditPage />);
  await screen.findByDisplayValue('Test Kullanıcı');
  fireEvent.change(screen.getByLabelText('Profil görseli seç'), { target: { files: [new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' })] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('PNG veya JPEG');
  expect(saveAccountProfile).not.toHaveBeenCalled();
});
