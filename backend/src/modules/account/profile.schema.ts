import { z } from "zod";

function validPhoto(value: string): boolean {
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return false;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 1024 * 1024 || bytes.length < 8) return false;
  const signature = match[1] === "png" ? [137, 80, 78, 71, 13, 10, 26, 10] : [255, 216, 255];
  return signature.every((byte, index) => bytes[index] === byte);
}

const text = (max: number): z.ZodNullable<z.ZodString> => z.string().trim().max(max).nullable();
export const profileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254).toLowerCase(),
    phone: text(40), jobTitle: text(100), about: text(2000), address: text(500),
    website: z.union([z.literal(""), z.string().trim().url().max(500).refine(value => /^https?:\/\//i.test(value), "Website http veya https ile başlamalıdır.")]).nullable(),
    photo: z.string().max(1400000).refine(validPhoto, "En fazla 1 MB boyutunda PNG veya JPEG görsel seçin.").nullable(),
  }).strict(),
});
export type ProfileInput = z.infer<typeof profileSchema>["body"];
