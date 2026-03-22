import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import * as userService from "../services/userService";
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.getUserProfile(req.user!.userId);
    sendSuccess(res, user);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      sendError(res, "User not found", 404);
      return;
    }
    sendError(res, "Failed to fetch profile", 500);
  }
};

export const getProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    let { userId } = req.params;
    if (Array.isArray(userId)) {
      userId = userId[0];
    }
    const user = await userService.getPublicProfile(userId);
    sendSuccess(res, user);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      sendError(res, "User not found", 404);
      return;
    }
    sendError(res, "Failed to fetch profile", 500);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, bio } = req.body;
    const user = await userService.updateProfile(req.user!.userId, {
      name,
      bio,
    });
    sendSuccess(res, user, "Profile updated successfully");
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      sendError(res, "User not found", 404);
      return;
    }
    sendError(res, "Failed to update profile", 500);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(
      req.user!.userId,
      currentPassword,
      newPassword,
    );
    sendSuccess(res, null, "Password changed successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        sendError(res, "User not found", 404);
        return;
      }
      if (error.message === "INVALID_CURRENT_PASSWORD") {
        sendError(res, "Current password is incorrect", 400);
        return;
      }
    }
    sendError(res, "Failed to change password", 500);
  }
};

export const searchUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string" || q.trim().length < 2) {
      sendError(res, "Search query must be at least 2 characters", 400);
      return;
    }

    const users = await userService.searchUsers(q.trim(), req.user!.userId);
    sendSuccess(res, users);
  } catch {
    sendError(res, "Search failed", 500);
  }
};
