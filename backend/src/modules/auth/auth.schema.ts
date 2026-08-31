import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalıdır")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/,
    "Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir"
  );

const slugSchema = z
  .string()
  .min(2, "Organizasyon slug en az 2 karakter olmalıdır")
  .max(64, "Organizasyon slug en fazla 64 karakter olabilir")
  .regex(/^[a-z0-9-]+$/, "Slug yalnızca küçük harf, rakam ve tire içerebilir");

const emailSchema = z.string().email("Geçerli bir email adresi giriniz").toLowerCase();

export const registerSchema = z.object({
  body: z.object({
    organizationSlug: slugSchema,
    email: emailSchema,
    password: passwordSchema,
    name: z.string().min(2, "İsim en az 2 karakter olmalıdır").max(100).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    organizationSlug: slugSchema,
    email: emailSchema,
    password: z.string().min(1, "Şifre zorunludur"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    organizationSlug: slugSchema,
    email: emailSchema,
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token zorunludur"),
    password: passwordSchema,
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Token zorunludur"),
  }),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    organizationSlug: slugSchema,
    email: emailSchema,
  }),
});

export type RegisterBody = z.infer<typeof registerSchema>["body"];
export type LoginBody = z.infer<typeof loginSchema>["body"];
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>["body"];
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>["body"];
export type ResendVerificationBody = z.infer<typeof resendVerificationSchema>["body"];

