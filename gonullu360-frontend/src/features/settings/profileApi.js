import { getAccountProfile as getProfile, updateAccountProfile } from '../../services/api';

export async function getAccountProfile() {
  const profile = await getProfile();
  return { ...profile, photo: profile.photoUrl || null };
}

export async function saveAccountProfile(profile) {
  const fields = { ...profile };
  const photo = fields.photo;
  delete fields.photo;
  const saved = await updateAccountProfile({ ...fields, photoUrl: photo || null });
  return { ...saved, photo: saved.photoUrl || null };
}
