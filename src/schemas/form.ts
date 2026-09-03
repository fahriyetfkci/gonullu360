import { z } from 'zod';

const idSchema = z.string().min(1).max(128);
const fieldSchema = z.object({
  id: idSchema,
  type: z.enum(['full_name', 'email', 'phone', 'multiple_choice', 'date', 'file', 'long_text']),
  label: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional(),
  placeholder: z.string().max(300).optional(),
  required: z.boolean().optional().default(false),
  options: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  fileSettings: z.object({ acceptedTypes: z.array(z.string().min(1).max(32)).max(20), maxSizeMb: z.number().int().min(1).max(100) }).optional(),
}).superRefine((field, context) => {
  if (field.type === 'multiple_choice' && (!field.options || field.options.length < 2)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'En az iki seçenek gereklidir' });
  if (field.type === 'file' && !field.fileSettings) context.addIssue({ code: z.ZodIssueCode.custom, path: ['fileSettings'], message: 'Dosya ayarları zorunludur' });
});

export const formSchema = z.object({
  schemaVersion: z.literal(1), id: idSchema, title: z.string().max(200),
  description: z.string().max(2000).optional().default(''),
  sections: z.array(z.object({
    id: idSchema, title: z.string().max(200).optional().default(''),
    description: z.string().max(1000).optional(), fields: z.array(fieldSchema).max(100),
  })).min(1).max(20),
}).superRefine((form, context) => {
  const ids = new Set<string>();
  for (const section of form.sections) for (const id of [section.id, ...section.fields.map(field => field.id)]) {
    if (ids.has(id)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['sections'], message: 'Bölüm ve alan kimlikleri benzersiz olmalıdır' });
    ids.add(id);
  }
});

export const createFormRequestSchema = z.object({ body: z.object({ schema: formSchema }) });
export const updateFormRequestSchema = z.object({ body: z.object({ schema: formSchema, expectedRevision: z.number().int().positive() }) });
export const publishFormRequestSchema = z.object({ body: z.object({ expectedRevision: z.number().int().positive() }) });
export type FormDefinition = z.infer<typeof formSchema>;
