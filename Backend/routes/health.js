const router = require("express").Router();

// Root route — UptimeRobot / Browser direct ping ke liye
router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "CollabHub server is running!",
  });
});

// /health route — Detailed health check ke liye
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: `${Math.floor(process.uptime())}s`,
    pid: process.pid,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
