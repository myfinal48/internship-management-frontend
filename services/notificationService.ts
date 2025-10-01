import { apiClient } from "@/lib/axios";
import {
  MarkReadRequestDTO,
  ArchiveNotificationRequestDTO,
  CreateNotificationDTO,
  NotificationDTO,
} from "../types/index";

const BASE_URL = "/notifications";

async function fetchAllNotifications(): Promise<NotificationDTO[]> {
  const response = await apiClient.get(`${BASE_URL}`);
  return response.data;
}

async function fetchUserNotifications(
  userId: number,
  unreadOnly: boolean | undefined
): Promise<NotificationDTO[]> {
  if (!unreadOnly) {
    const [List1, List2] = await Promise.all([
      apiClient.get(`${BASE_URL}/users/${userId}`, {
        params: { unreadOnly: false },
      }),
      apiClient.get(`${BASE_URL}/users/${userId}`, {
        params: { unreadOnly: true },
      }),
    ]);
    const response = [...List1.data, ...List2.data];
    return response;
  } else {
    const response = await apiClient.get(`${BASE_URL}/users/${userId}`, {
      params: { unreadOnly: true },
    });
    return response.data;
  }
}

async function getNotificationById(id: number): Promise<NotificationDTO> {
  const response = await apiClient.get(`${BASE_URL}/${id}`);
  return response.data;
}

async function getNotificationByStatus(
  userId: number,
  status: string
): Promise<NotificationDTO[]> {
  const response = await apiClient.get(`${BASE_URL}/status`, {
    params: {
      userId: userId,
      status: status,
    },
  });
  return response.data;
}

async function createAndPostNotification(
  notification: CreateNotificationDTO
): Promise<NotificationDTO> {
  const response = await apiClient.post(`${BASE_URL}`, notification);
  return response.data;
}

async function markNotificationsAsRead(
  markReadRequestDTO: MarkReadRequestDTO
): Promise<void> {
  await apiClient.patch(`${BASE_URL}/mark-read`, markReadRequestDTO);
}

async function archiveNotification(
  archiveNotificationRequestDTO: ArchiveNotificationRequestDTO
): Promise<void> {
  await apiClient.patch(`${BASE_URL}/archive`, archiveNotificationRequestDTO);
}

async function updateNotification(
  id: number,
  createNotificationDTO: CreateNotificationDTO
): Promise<NotificationDTO> {
  const response = await apiClient.put(
    `${BASE_URL}/${id}`,
    createNotificationDTO
  );
  return response.data;
}

async function deleteNotification(id: number): Promise<void> {
  await apiClient.delete(`${BASE_URL}/${id}`);
}

async function deleteUserNotification(
  userId: number,
  notificationId: number
): Promise<void> {
  await apiClient.delete(`${BASE_URL}/${notificationId}/users/${userId}`);
}

async function archiveAllUnread(
  archiveAllUnreadDTO: { userId: number; notificationIds?: number[] }
): Promise<void> {
  await apiClient.patch(`${BASE_URL}/archive-all-unread`, archiveAllUnreadDTO);
}

export const notificationService = {
  fetchAllNotifications,
  fetchUserNotifications,
  getNotificationById,
  getNotificationByStatus,
  createAndPostNotification,
  markNotificationsAsRead,
  archiveNotification,
  archiveAllUnread,
  updateNotification,
  deleteNotification,
  deleteUserNotification,
};
