import { z } from "zod";
export const emailSchema = z.string().trim().toLowerCase().email("Введіть коректний email");
export const passwordSchema = z
  .string()
  .min(8, "Пароль має містити щонайменше 8 символів")
  .max(128);
export const nameSchema = z.string().trim().min(2).max(80);
export const signInSchema = z.object({ email: emailSchema, password: passwordSchema });
export const signUpSchema = signInSchema.extend({ name: nameSchema });
