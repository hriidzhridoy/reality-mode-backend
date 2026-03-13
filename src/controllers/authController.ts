import { Request, Response } from "express";
import * as authService from "../services/authService";
import { sendSuccess, sendCreated, sendError } from "../utils/response";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, bio } = req.body;
    const result = await authService.registerUser(name, email, password, bio);
    sendCreated(res, result, "Account created successfully");
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      sendError(res, "An account with this email already exists", 409);
      return;
    }
    sendError(res, "Registration failed", 500);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    sendSuccess(res, result, "Logged in successfully");
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      sendError(res, "Invalid email or password", 401);
      return;
    }
    sendError(res, "Login failed", 500);
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      sendError(res, "Refresh token required", 400);
      return;
    }
    const result = await authService.refreshAccessToken(refreshToken);
    sendSuccess(res, result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "INVALID_REFRESH_TOKEN") {
      sendError(res, "Invalid or expired refresh token", 401);
      return;
    }
    sendError(res, "Token refresh failed", 500);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && req.user) {
      await authService.logoutUser(refreshToken, req.user.userId);
    }
    sendSuccess(res, null, "Logged out successfully");
  } catch {
    sendSuccess(res, null, "Logged out");
  }
};
