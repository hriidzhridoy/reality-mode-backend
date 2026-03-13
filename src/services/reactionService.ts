import { ReactionType } from "@prisma/client";
import prisma from "../utils/prisma";

export const upsertReaction = async (
  userId: string,
  postId: string,
  reactionType: ReactionType,
) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error("POST_NOT_FOUND");

  // upsert = update if exists, create if not
  return prisma.reaction.upsert({
    where: { userId_postId: { userId, postId } },
    update: { reactionType },
    create: { userId, postId, reactionType },
    select: { id: true, reactionType: true, postId: true, userId: true },
  });
};

export const removeReaction = async (userId: string, postId: string) => {
  const reaction = await prisma.reaction.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (!reaction) throw new Error("REACTION_NOT_FOUND");
  if (reaction.userId !== userId) throw new Error("FORBIDDEN");

  await prisma.reaction.delete({
    where: { userId_postId: { userId, postId } },
  });
};
