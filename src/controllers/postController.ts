import { Request, Response } from "express";
import * as postService from "../services/postService";
import {
  sendSuccess,
  sendCreated,
  sendError,
  parsePagination,
} from "../utils/response";
import { Privacy } from "@prisma/client";

// ─────────────────────────────────────────
// CREATE POST
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// GET FEED (authenticated = personalized, unauthenticated = public only)
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// GET POSTS BY USER
// ─────────────────────────────────────────
export const getUserPosts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    let { userId } = req.params;
    if (Array.isArray(userId)) {
      userId = userId[0];
    }
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string,
    );

    const result = await postService.getUserPosts(
      userId,
      req.user?.userId, // optional — affects which privacy levels are visible
      page,
      limit,
    );

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
    sendError(res, "Failed to fetch user posts", 500);
  }
};

// ─────────────────────────────────────────
// GET SINGLE POST
// ─────────────────────────────────────────
export const getPost = async (req: Request, res: Response): Promise<void> => {
  try {
    let { postId } = req.params;
    if (Array.isArray(postId)) {
      postId = postId[0];
    }
    const post = await postService.getPostById(postId, req.user?.userId);
    sendSuccess(res, post);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "POST_NOT_FOUND") {
      sendError(res, "Post not found", 404);
      return;
    }
    sendError(res, "Failed to fetch post", 500);
  }
};

// ─────────────────────────────────────────
// UPDATE POST
// ─────────────────────────────────────────
export const updatePost = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    let { postId } = req.params;
    if (Array.isArray(postId)) {
      postId = postId[0];
    }
    const { highlight, reality, privacy } = req.body;

    const post = await postService.updatePost(postId, req.user!.userId, {
      highlight,
      reality,
      privacy,
    });

    sendSuccess(res, post, "Post updated successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "POST_NOT_FOUND") {
        sendError(res, "Post not found", 404);
        return;
      }
      if (error.message === "FORBIDDEN") {
        sendError(res, "You can only edit your own posts", 403);
        return;
      }
      if (error.message === "HIGHLIGHT_REQUIRED") {
        sendError(res, "Highlight cannot be empty", 422);
        return;
      }
      if (error.message === "REALITY_REQUIRED") {
        sendError(res, "Reality cannot be empty", 422);
        return;
      }
    }
    sendError(res, "Failed to update post", 500);
  }
};

// ─────────────────────────────────────────
// DELETE POST
// ─────────────────────────────────────────
export const deletePost = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    let { postId } = req.params;
    if (Array.isArray(postId)) {
      postId = postId[0];
    }
    await postService.deletePost(postId, req.user!.userId);
    sendSuccess(res, null, "Post deleted successfully");
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "POST_NOT_FOUND") {
        sendError(res, "Post not found", 404);
        return;
      }
      if (error.message === "FORBIDDEN") {
        sendError(res, "You can only delete your own posts", 403);
        return;
      }
    }
    sendError(res, "Failed to delete post", 500);
  }
};
