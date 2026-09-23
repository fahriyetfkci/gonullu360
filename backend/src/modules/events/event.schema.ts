import { z } from "zod";

const idSchema = z.string().min(1).max(128);
const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Kısa URL yalnızca küçük harf, rakam ve tire içerebilir");

const eventInputSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    slug: slugSchema,
    type: z.enum(["IN_PERSON", "ONLINE"]),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    timezone: z.string().trim().min(1).max(64).default("Europe/Istanbul"),
    address: z.string().trim().max(500).nullable().optional(),
    capacity: z.number().int().positive().max(1_000_000).nullable().optional(),
    contactInfo: z.string().trim().max(250).nullable().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    posterUrl: z.string().regex(/^\/uploads\/events\/[0-9a-f-]+\.(?:png|jpg)$/).nullable().optional(),
    posterStorageKey: z.string().regex(/^events\/[0-9a-f-]+\.(?:png|jpg)$/).nullable().optional(),
    registrationFormId: idSchema.nullable().optional(),
    groupIds: z.array(idSchema).min(1, "En az bir grup seçilmelidir").max(50),
  })
  .superRefine((event, context) => {
    if (new Date(event.endsAt) <= new Date(event.startsAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "Bitiş zamanı başlangıç zamanından sonra olmalıdır",
      });
    }

    if (event.type === "IN_PERSON" && !event.address?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address"],
        message: "Fiziksel etkinliklerde adres zorunludur",
      });
    }

    if (new Set(event.groupIds).size !== event.groupIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupIds"],
        message: "Aynı grup birden fazla seçilemez",
      });
    }

    if (Boolean(event.posterUrl) !== Boolean(event.posterStorageKey)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["posterUrl"],
        message: "Afiş URL ve depolama anahtarı birlikte gönderilmelidir",
      });
    }
  });

export const eventParamsSchema = z.object({
  params: z.object({ id: idSchema }),
});

export const listEventsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED", "ARCHIVED"]).optional(),
    groupId: idSchema.optional(),
    search: z.string().trim().max(160).optional(),
  }),
});

export const createEventSchema = z.object({ body: eventInputSchema });
export const updateEventSchema = z.object({
  params: z.object({ id: idSchema }),
  body: eventInputSchema,
});

export const createEventGroupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
});

export type EventInput = z.infer<typeof eventInputSchema>;
export type ListEventsQuery = z.infer<typeof listEventsSchema>["query"];
export type EventParams = z.infer<typeof eventParamsSchema>["params"];
export type CreateEventGroupBody = z.infer<typeof createEventGroupSchema>["body"];
