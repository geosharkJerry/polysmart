import openNextWorker, {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache
} from "./.open-next/worker.js";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };

const CRON_VALIDATION_URL = "https://polysmart.internal/api/admin/production-validation-cron";

function scheduledAttemptId() {
  return `SCHED-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function persistScheduledAttempt(env, record) {
  if (!env.POLYSMART_DB) {
    return;
  }

  try {
    await env.POLYSMART_DB.prepare(
      `INSERT INTO production_scheduled_validation_attempts (
        id, cron, scheduled_time, trigger_ref, status, response_status, message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      record.id,
      record.cron,
      record.scheduledTime,
      record.triggerRef,
      record.status,
      record.responseStatus,
      record.message,
      record.createdAt
    ).run();
  } catch {
    // The scheduled handler should not fail just because optional diagnostics are unavailable.
  }
}

async function runScheduledProductionValidation(controller, env, ctx) {
  const cronSecret = String(env.CRON_SECRET || "").trim();
  const triggerRef = `cloudflare-scheduled:${controller.cron || "unknown"}`;
  const attemptId = scheduledAttemptId();
  await persistScheduledAttempt(env, {
    id: attemptId,
    cron: controller.cron || "unknown",
    scheduledTime: controller.scheduledTime ? new Date(controller.scheduledTime).toISOString() : null,
    triggerRef,
    status: "STARTED",
    responseStatus: null,
    message: "Cloudflare scheduled production validation started.",
    createdAt: new Date().toISOString()
  });

  const request = new Request(CRON_VALIDATION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": cronSecret,
      "x-trigger-ref": triggerRef
    },
    body: JSON.stringify({
      probeNetwork: true,
      triggerRef
    })
  });

  const response = await openNextWorker.fetch(request, env, ctx);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    await persistScheduledAttempt(env, {
      id: scheduledAttemptId(),
      cron: controller.cron || "unknown",
      scheduledTime: controller.scheduledTime ? new Date(controller.scheduledTime).toISOString() : null,
      triggerRef,
      status: "ERROR",
      responseStatus: response.status,
      message: body.slice(0, 240) || `Production validation cron failed with ${response.status}.`,
      createdAt: new Date().toISOString()
    });
    throw new Error(`Production validation cron failed with ${response.status}: ${body.slice(0, 240)}`);
  }

  await persistScheduledAttempt(env, {
    id: scheduledAttemptId(),
    cron: controller.cron || "unknown",
    scheduledTime: controller.scheduledTime ? new Date(controller.scheduledTime).toISOString() : null,
    triggerRef,
    status: "SUCCESS",
    responseStatus: response.status,
    message: "Cloudflare scheduled production validation completed.",
    createdAt: new Date().toISOString()
  });
}

export default {
  fetch(request, env, ctx) {
    return openNextWorker.fetch(request, env, ctx);
  },

  scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduledProductionValidation(controller, env, ctx));
  }
};
