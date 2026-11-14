import { z } from 'zod';

const passwordRule = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar 72 caracteres.')
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra.')
  .regex(/[0-9]/, 'Debe incluir al menos un número.');

export const loginSchema = z.object({
  email: z.string().trim().email('Ingresa un correo electrónico válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Tu nombre debe tener al menos 2 caracteres.')
    .max(120, 'Tu nombre no puede superar 120 caracteres.'),
  email: z.string().trim().email('Ingresa un correo electrónico válido.'),
  password: passwordRule,
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Ingresa un correo electrónico válido.'),
});

export const resetPasswordSchema = z
  .object({
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
