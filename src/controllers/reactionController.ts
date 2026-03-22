import { Request, Response } from "express";
import * as reactionService from "../services/reactionService";
import { sendSuccess, sendError } from "../utils/response";
import { ReactionType } from "@prisma/client";

const VALID_REACTIONS = Object.values(ReactionType);

export const reactToPost = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    let { postId } = req.params;
    const { reactionType } = req.body;

    if (Array.isArray(postId)) {
      postId = postId[0];
    }

    if (!VALID_REACTIONS.includes(reactionType)) {
      sendError(
        res,
        `Invalid reaction. Must be one of: ${VALID_REACTIONS.join(", ")}`,
        422,
      );
      return;
    }

    const reaction = await reactionService.upsertReaction(
      req.user!.userId,
      postId,
      reactionType as ReactionType,
    );

    sendSuccess(res, reaction, "Reaction recorded");
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "POST_NOT_FOUND") {
      sendError(res, "Post not found", 404);
      return;
    }
    sendError(res, "Failed to react to post", 500);
  }
};

export const removeReaction = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    let { postId } = req.params;
    if (Array.isArray(postId)) {
      postId = postId[0];
    }

    await reactionService.removeReaction(req.user!.userId, postId);

    sendSuccess(res, null, "Reaction removed");
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "REACTION_NOT_FOUND") {
        sendError(res, "No reaction found to remove", 404);
        return;
      }
      if (error.message === "FORBIDDEN") {
        sendError(res, "You can only remove your own reactions", 403);
        return;
      }
    }
    sendError(res, "Failed to remove reaction", 500);
  }
};
