export const DEFAULT_EDUCATION_LEVEL = 'Ön Lisans';

export function normalizeEducationLevel(value: unknown): string {
  const level = String(value ?? '').trim();
  if (!level || level === 'Üniversite') return DEFAULT_EDUCATION_LEVEL;
  return level;
}
