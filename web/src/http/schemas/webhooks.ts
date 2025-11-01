import { z } from 'zod'

export const webhookListItemSchema = {
  id: z.uuidv7(),
  method: z.string(),
  pathname: z.string(),
  createdAt: z.coerce.date(),
}

export const webhookListSchema = z.object({
  webhooks: z.array(z.object(webhookListItemSchema)),
  nextCursor: z.string().nullable(),
})
