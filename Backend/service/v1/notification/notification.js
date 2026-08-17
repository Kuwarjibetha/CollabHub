const { Notification, TeamMember } = require("../../../models");

async function createNotificationForTeam({ teamId, excludeUserId, type, title, content, relatedId }) {
  // Team ke saare members nikaalo, sender ko chhod ke (sender ko khud ki notification nahi chahiye)
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
}

// get notification
async function getMyNotifications(userId) {
  const notifications = await Notification.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit: 50,
  });
  return notifications;
}



// mark on rread
async function markAsRead(userId, notificationId) {
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
}



// mark all read
async function markAllAsRead(userId) {
  await Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } }
  );
  return { message: "All notifications marked as read" };
}




module.exports = { createNotificationForTeam, getMyNotifications, markAsRead, markAllAsRead };