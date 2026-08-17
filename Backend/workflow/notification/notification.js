const { addJob, getPendingJobs, updateJob } = require("../queue");
const notificationService = require("../../service/v1/notification");


function enqueueNotificationJob({ teamId, excludeUserId, type, title, content, relatedId }) {
  addJob({
    type: "notification",
    payload: { teamId, excludeUserId, type, title, content, relatedId },
  });
}


async function processJob(job) {
  updateJob(job.id, { status: "processing" });
  try {
    await notificationService.createNotificationForTeam(job.payload);
    updateJob(job.id, { status: "done" });
  } catch (err) {
    updateJob(job.id, {
      status: "failed",
      attempts: job.attempts + 1,
      lastError: err.message,
    });
  }
}


function startNotificationWorker() {
  setInterval(async () => {
    const pending = getPendingJobs().filter((j) => j.type === "notification");
    for (const job of pending) {
      await processJob(job);
    }
  }, 2000);
}

module.exports = { enqueueNotificationJob, processJob, startNotificationWorker };