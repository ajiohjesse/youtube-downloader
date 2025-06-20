import z from "zod/v4";

export const updateCookieSchema = z.object({
  cookies: z.string(),
});

export const videoSchema = z.object({
  id: z.number(),
  title: z.string(),
  url: z.string(),
  status: z.enum(["pending", "error", "completed"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const progressSchema = z.object({
  videoId: z.number(),
  progress: z.string(),
});
