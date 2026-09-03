import argon2, { type HashOptions } from 'argon2';
import bcrypt from 'bcryptjs';
import { config } from '../config';

const options: HashOptions = {
  type: argon2.argon2id as 2,
  memoryCost: config.argon2.memoryCost,
  timeCost: config.argon2.timeCost,
  parallelism: config.argon2.parallelism,
};

export const hashPassword = (password: string): Promise<string> => argon2.hash(password, { ...options, raw: false });

export async function verifyPassword(hash: string, password: string) {
  if (hash.startsWith('$argon2')) return argon2.verify(hash, password);
  if (hash.startsWith('$2')) return bcrypt.compare(password, hash);
  return false;
}

export const needsPasswordRehash = (hash: string) => !hash.startsWith('$argon2id$');

export function isStrongPassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{10,}$/.test(password);
}
