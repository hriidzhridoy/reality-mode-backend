import { Request, Response } from "express";
import * as circleService from "../services/circleService";
import {
  sendSuccess,
  sendCreated,
  sendError,
  parsePagination,
} from "../utils/response";

export const addToCircle = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    let { userId: memberId } = req.params;
    if (Array.isArray(memberId)) {
      memberId = memberId[0];
    }
    const entry = await circleService.addToCircle(req.user!.userId, memberId);
    sendCreated(res, entry, "User added to your close circle");
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "CANNOT_ADD_SELF") {
        sendError(res, "You cannot add yourself to your close circle", 400);
        return;
      }
      if (error.message === "USER_NOT_FOUND") {
        sendError(res, "User not found", 404);
        return;
      }
      if (error.message === "ALREADY_IN_CIRCLE") {
        sendError(res, "This user is already in your close circle", 409);
        return;
      }
    }
    sendError(res, "Failed to add to close circle", 500);
  }
};

export const removeFromCircle = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    let { userId: memberId } = req.params;
    if (Array.isArray(memberId)) {
      memberId = memberId[0];
    }
    await circleService.removeFromCircle(req.user!.userId, memberId);
    sendSuccess(res, null, "User removed from your close circle");
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "NOT_IN_CIRCLE") {
      sendError(res, "This user is not in your close circle", 404);
      return;
    }
    sendError(res, "Failed to remove from close circle", 500);
  }
};

export const getMyCircle = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string,
    );

    const result = await circleService.getMyCircle(
      req.user!.userId,
      page,
      limit,
    );

    res.json({
      success: true,
      data: {
        items: result.members,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasMore: skip + limit < result.total,
        },
      },
    });
  } catch {
    sendError(res, "Failed to fetch close circle", 500);
  }
};
