const { enqueueNotificationJob, startNotificationWorker } = require("./notification");
const { startRetryWorker } = require("./retryFailed");

function startWorkflows() {
  startNotificationWorker();
  startRetryWorker();
  console.log("Workflow workers started (notification + retry)");
}

module.exports = { enqueueNotificationJob, startWorkflows };