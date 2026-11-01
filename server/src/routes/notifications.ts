import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { sendError, sendSuccess } from "../utils/response.js";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notification/notificationService.js";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

/**
 * GET /api/v1/notifications
 * Get user's notifications and unread count
 */
notificationsRouter.get("/", async (req, res) => {
  const user = req.user!;
  const unreadOnly = req.query["unreadOnly"] === "true";

  try {
    const result = await getUserNotifications(user.id, unreadOnly);
    return sendSuccess(res, result.notifications, "Notifications retrieved", 200, undefined);
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read
 */
notificationsRouter.patch("/:id/read", async (req, res) => {
  const user = req.user!;
  const notificationId = req.params["id"] as string;

  try {
    const updated = await markNotificationAsRead(user.id, notificationId);
    return sendSuccess(res, updated, "Notification marked as read");
  } catch (err: any) {
    return sendError(res, "NOTIFICATION_NOT_FOUND", err.message, 404);
  }
});

/**
 * POST /api/v1/notifications/mark-all-read
 * Mark all user notifications as read
 */
notificationsRouter.post("/mark-all-read", async (req, res) => {
  const user = req.user!;

  try {
    const result = await markAllNotificationsAsRead(user.id);
    return sendSuccess(res, result, "All notifications marked as read");
  } catch (err: any) {
    return sendError(res, "INTERNAL_SERVER_ERROR", err.message, 500);
  }
});
