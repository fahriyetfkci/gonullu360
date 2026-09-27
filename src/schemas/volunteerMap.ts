import { z } from 'zod';

export const educationInstitutionCountsSchema = z.object({
  universities: z.number().int().nonnegative(),
  middleSchools: z.number().int().nonnegative(),
  highSchools: z.number().int().nonnegative(),
  vocationalHighSchools: z.number().int().nonnegative(),
});

export const volunteerMapCitySchema = z.object({
  city: z.string().min(1),
  volunteerCount: z.number().int().nonnegative(),
  studentCount: z.number().int().nonnegative(),
  monthlyAverageEvents: z.number().nonnegative(),
  educationInstitutions: educationInstitutionCountsSchema,
});

export const volunteerMapResponseSchema = z.object({
  cities: z.array(volunteerMapCitySchema).length(81),
  educationInstitutionPeriod: z.string().regex(/^\d{4}-\d{4}$/),
  educationStatsSyncedAt: z.date().nullable(),
  educationSyncStatus: z.enum(['success', 'running', 'failed', 'not_started']),
  educationSyncError: z.string().nullable(),
  educationSyncLastAttemptAt: z.date().nullable(),
  totalVolunteers: z.number().int().nonnegative(),
});

export const educationSyncResponseSchema = z.object({
  message: z.string().min(1),
});
