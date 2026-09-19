import { z } from 'zod';

const text = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(4000).nullable().optional();
export const person = z.object({
  name: text, city: text, gender: text, age: z.number().int().min(1).max(120),
  education: text.default('Belirtilmemiş'),
});
export const application = person.extend({
  phone: optionalText, email: z.string().email().or(z.literal('')).nullable().optional(),
  address: optionalText, interests: z.array(text).max(50).optional(), coverLetter: optionalText,
});
export const profile = z.object({
  birthDate: z.string().date().nullable().optional(), department: optionalText, phone: optionalText,
  email: z.string().email().or(z.literal('')).nullable().optional(), address: optionalText,
  photoUrl: z.string().url().startsWith('https://').nullable().optional(),
  managerNote: optionalText, coverLetter: optionalText, interests: z.array(text).max(50).optional(),
});
export const education = z.object({
  level: text, school: text, department: optionalText,
  startYear: z.number().int().min(1900).max(2100).nullable().optional(),
  endYear: z.number().int().min(1900).max(2100).nullable().optional(), current: z.boolean().default(false),
});
export const body = <T extends z.ZodTypeAny>(schema: T): z.ZodObject<{ body: T }> => z.object({ body: schema });
