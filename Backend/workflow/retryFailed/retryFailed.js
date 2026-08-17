const { getFailedJobs } = require("../queue");
const { processJob } = require("../notification");


function startRetryWorker() {
  setInterval(async () => {
    const failedJobs = getFailedJobs();
    for (const job of failedJobs) {
      console.log(`Retrying job ${job.id}, attempt ${job.attempts + 1}`);
      await processJob(job);
    }
  }, 10000);   
}

module.exports = { startRetryWorker };