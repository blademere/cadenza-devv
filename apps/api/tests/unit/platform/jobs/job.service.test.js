import { beforeEach, describe, expect, it, vi } from "vitest"

const bullmq = require("../../../../src/infrastructure/queue/bullmq")
const enqueueBullMqJob = vi.spyOn(bullmq, "enqueueJob")
const { enqueueJob } = require("../../../../src/platform/jobs/job.service.js")

describe("job service", () => {
  beforeEach(() => {
    enqueueBullMqJob.mockReset()
  })

  it("enqueues a job with stable defaults", async () => {
    enqueueBullMqJob.mockResolvedValue({ id: "job-1" })

    await enqueueJob({
      queue: "notifications",
      name: "notification.delivery",
      data: { deliveryId: "delivery-1" },
      jobId: "notification-delivery:delivery-1",
    })

    expect(enqueueBullMqJob).toHaveBeenCalledWith(
      "notifications",
      "notification.delivery",
      { deliveryId: "delivery-1" },
      expect.objectContaining({
        jobId: "notification-delivery-delivery-1",
        attempts: 5,
        delay: 0,
        backoff: { type: "exponential", delay: 1000 },
      }),
    )
  })

  it("rejects unknown queues", async () => {
    await expect(enqueueJob({
      queue: "missing",
      name: "test",
      data: {},
    })).rejects.toThrow("Unknown job queue: missing")
  })
})
