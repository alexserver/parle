import { z } from 'zod'

export const UploadResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['initial', 'transcribed', 'summarized', 'failed']),
  transcriptPreview: z.string().optional(),
  summary: z.string().optional()
})

export type UploadResponse = z.infer<typeof UploadResponseSchema>

export const HealthResponseSchema = z.object({
  ok: z.boolean()
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>