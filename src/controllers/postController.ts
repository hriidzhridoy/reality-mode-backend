import { Request, Response } from "express";
import * as postService from "../services/postService";
import {
  sendSuccess,
  sendCreated,
  sendError,
  parsePagination,
} from "../utils/response";
import { Privacy } from "@prisma/client";

export const createPost = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { highlight, reality, privacy } = req.body;
    const post = await postService.createPost(
      req.user!.userId,
      highlight,
      reality,
      privacy || Privacy.PUBLIC,
    );
    sendCreated(res, post, "Post created");
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "HIGHLIGHT_REQUIRED") {
        sendError(res, "Highlight is required", 422);
        return;
      }
      if (error.message === "REALITY_REQUIRED") {
        sendError(res, "Reality is required", 422);
        return;
      }
    }
    sendError(res, "Failed to create post", 500);
  }
};

export const getFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string,
    );
    const result = req.user
      ? await postService.getFeed(req.user.userId, page, limit)
      : await postService.getPublicFeed(page, limit);

    res.json({
      success: true,
      data: {
        items: result.posts,
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
    sendError(res, "Failed to fetch feed", 500);
  }
};
