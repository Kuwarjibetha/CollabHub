const { Notification, TeamMember } = require("../../../models");

async function createNotificationForTeam({ teamId, excludeUserId, type, title, content, relatedId }) {
  try {
    const members = await TeamMember.findAll({ where: { teamId } });

    const recipientIds = members
      .map((m) => m.userId)
      .filter((id) => id !== excludeUserId);

    const notifications = await Notification.bulkCreate(
      recipientIds.map((userId) => ({
        userId,
        type,
        title,
        content,
        relatedId,
      }))
    );

    return notifications;
  } catch (error) {
    throw error;
  }
}

// Get user notifications
async function getMyNotifications(userId) {
  try {
    const notifications = await Notification.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    return notifications;
  } catch (error) {
    throw error;
  }
}

// Mark single notification as read
async function markAsRead(userId, notificationId) {
  try {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      throw error;
    }

    notification.isRead = true;
    await notification.save();

    return notification;
  } catch (error) {
    throw error;
  }
}

// Mark all notifications as read
async function markAllAsRead(userId) {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );
    return { message: "All notifications marked as read" };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  createNotificationForTeam,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};