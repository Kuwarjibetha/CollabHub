const notificationService = require("../../../service/v1/notification");

async function getMyNotificationsController(req, res) {
  try {
    const notifications = await notificationService.getMyNotifications(req.user.userId);
    return res.status(200).json({
      success: true,
      message: "Notifications fetched",
      data: notifications,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
}

async function markAsReadController(req, res) {
  try {
    const { notificationId } = req.params;
    const notification = await notificationService.markAsRead(req.user.userId, notificationId);
    return res.status(200).json({
      success: true,
      message: "Marked as read",
      data: notification,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
}

async function markAllAsReadController(req, res) {
  try {
    const result = await notificationService.markAllAsRead(req.user.userId);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
}

module.exports = { getMyNotificationsController, markAsReadController, markAllAsReadController };