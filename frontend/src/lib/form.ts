import { z } from "zod";

export const emailSchema = z.string().email("Please enter a valid email");
export const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
export const nameSchema = z.string().min(2, "Name must be at least 2 characters");

export function parseZod<T>(schema: z.ZodType<T>, data: unknown) {
  const res = schema.safeParse(data);
  if (!res.success) {
    // return the first message found
    const issue = res.error.issues[0];
    throw new Error(issue?.message || "Invalid input");
  }
  return res.data;
}
