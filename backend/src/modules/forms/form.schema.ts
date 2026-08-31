import { z } from "zod";

const idSchema = z.string().min(1).max(128);
const fieldTypeSchema = z.enum([
  "full_name",
  "email",
  "phone",
  "multiple_choice",
  "date",
  "file",
  "long_text",
]);

const fileSettingsSchema = z.object({
  acceptedTypes: z.array(z.string().min(1).max(32)).max(20),
  maxSizeMb: z.number().int().min(1).max(100),
});

const fieldSchema = z
  .object({
    id: idSchema,
    type: fieldTypeSchema,
    label: z.string().trim().min(1).max(200),
    description: z.string().max(1000).optional(),
    placeholder: z.string().max(300).optional(),
    required: z.boolean(),
    options: z.array(z.string().max(200)).max(50).optional(),
    fileSettings: fileSettingsSchema.optional(),
  })
  .superRefine((field, context) => {
    if (field.type === "file" && !field.fileSettings) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["fileSettings"], message: "Dosya alanı ayarları zorunludur" });
    }
  });

const sectionSchema = z.object({
  id: idSchema,
  title: z.string().max(200),
  description: z.string().max(1000).optional(),
  fields: z.array(fieldSchema).max(100),
});

export const formDefinitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    title: z.string().max(200),
    description: z.string().max(2000),
    sections: z.array(sectionSchema).min(1).max(20),
  })
  .superRefine((form, context) => {
    const ids = new Set<string>();
    for (const section of form.sections) {
      if (ids.has(section.id)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["sections"], message: "Bölüm ve alan kimlikleri benzersiz olmalıdır" });
      }
      ids.add(section.id);
      for (const field of section.fields) {
        if (ids.has(field.id)) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ["sections"], message: "Bölüm ve alan kimlikleri benzersiz olmalıdır" });
        }
        ids.add(field.id);
      }
    }
  });

const organizationSlugSchema = z.string().min(2).max(64).regex(/^[a-z0-9-]+$/);

export const draftQuerySchema = z.object({
  query: z.object({
    organizationSlug: organizationSlugSchema,
    clientFormId: idSchema.optional(),
  }),
});

export const saveDraftRequestSchema = z.object({
  body: z.object({
    organizationSlug: organizationSlugSchema,
    expectedRevision: z.number().int().min(0),
    schema: formDefinitionSchema,
  }),
});

export const publishRequestSchema = z.object({
  body: z.object({
    organizationSlug: organizationSlugSchema,
    clientFormId: idSchema,
    expectedRevision: z.number().int().positive(),
  }),
});

export function isFormDefinitionPublishable(form: FormDefinition): boolean {
  if (form.title.trim().length < 2) return false;
  const fields = form.sections.flatMap((section) => section.fields);
  if (fields.length === 0) return false;
  return fields.every((field) => {
    if (!field.label.trim()) return false;
    if (field.type === "multiple_choice") {
      return Boolean(field.options?.length) && field.options?.every((option) => option.trim().length > 0);
    }
    return field.type !== "file" || Boolean(field.fileSettings);
  });
}

export type FormDefinition = z.infer<typeof formDefinitionSchema>;
export type DraftQuery = z.infer<typeof draftQuerySchema>["query"];
export type SaveDraftBody = z.infer<typeof saveDraftRequestSchema>["body"];
export type PublishBody = z.infer<typeof publishRequestSchema>["body"];
