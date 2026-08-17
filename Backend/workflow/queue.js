const queue = [];

function addJob(job) {
  queue.push({
    ...job,
    id: Date.now() + "-" + Math.random().toString(36).slice(2),
    status: "pending",  
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date(),
  });
}

function getPendingJobs() {
  return queue.filter((j) => j.status === "pending");
}

function getFailedJobs() {
  
  return queue.filter((j) => j.status === "failed" && j.attempts < j.maxAttempts);
}

function updateJob(jobId, updates) {
  const job = queue.find((j) => j.id === jobId);
  if (job) Object.assign(job, updates);
}

module.exports = { addJob, getPendingJobs, getFailedJobs, updateJob };