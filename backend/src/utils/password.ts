import argon2 from "argon2";
import { env } from "../config/env";

const argon2Options: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: env.ARGON2_MEMORY_COST,
  timeCost: env.ARGON2_TIME_COST,
  parallelism: env.ARGON2_PARALLELISM,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, argon2Options);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function validatePasswordStrength(password: string): boolean {
  // Min 8 chars, at least one uppercase, one lowercase, one digit, one special char
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;
  return regex.test(password);
}

