import { z } from 'zod'

const listNotificationsValidator = async (req) =>
  z
    .object({
      query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        unreadOnly: z.coerce.boolean().default(false),
      }),
    })
    .parse({ query: req.query || {} })

const notificationIdValidator = async (req) =>
  z
    .object({
      params: z.object({ id: z.uuid() }),
    })
    .parse({ params: req.params || {} })

const sendNotificationValidator = async (req) =>
  z
    .object({
      body: z.object({
        userId: z.coerce.number().int().positive(),
        type: z.string().trim().min(1).max(150),
        title: z.string().trim().min(1).max(255),
        message: z.string().trim().min(1).max(5000),
        data: z.record(z.string(), z.unknown()).nullable().optional(),
        channels: z.array(z.string().trim().min(1).max(30)).min(1).optional(),
      }),
    })
    .parse({ body: req.body || {} })

const notificationPreferenceValidator = async (req) =>
  z
    .object({
      body: z.object({
        channel: z.string().trim().min(1).max(30),
        destination: z.string().trim().max(2048).nullable().optional(),
        enabled: z.boolean().default(true),
      }),
    })
    .parse({ body: req.body || {} })

export {
  listNotificationsValidator,
  notificationIdValidator,
  sendNotificationValidator,
  notificationPreferenceValidator,
}
