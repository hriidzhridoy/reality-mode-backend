import { Privacy } from "@prisma/client";
import prisma from "../utils/prisma";

// This is the heart of the privacy system
const buildPrivacyFilter = async (requestingUserId?: string) => {
  if (!requestingUserId) {
    return { privacy: Privacy.PUBLIC };
  }

  // Find all users who have added the requesting user to their circle
  // (meaning that user can see THEIR close_circle posts)
  const circleOwners = await prisma.closeCircle.findMany({
    where: { memberId: requestingUserId },
    select: { ownerId: true },
  });
  const circleOwnerIds = circleOwners.map((c) => c.ownerId);

  return {
    OR: [
      { userId: requestingUserId }, // own posts
      { privacy: Privacy.PUBLIC, userId: { not: requestingUserId } }, // public from others
      { privacy: Privacy.CLOSE_CIRCLE, userId: { in: circleOwnerIds } }, // circle posts
    ],
  };
};

export const createPost = async (
  userId: string,
  highlight: string,
  reality: string,
  privacy: Privacy,
) => {
  if (!highlight?.trim()) throw new Error("HIGHLIGHT_REQUIRED");
  if (!reality?.trim()) throw new Error("REALITY_REQUIRED");

  return prisma.post.create({
    data: {
      userId,
      highlight: highlight.trim(),
      reality: reality.trim(),
      privacy,
    },
    include: {
      user: { select: { id: true, name: true, bio: true } },
      _count: { select: { reactions: true } },
    },
  });
};

export const getFeed = async (
  requestingUserId: string,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;
  const where = await buildPrivacyFilter(requestingUserId);

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, bio: true } },
        reactions: {
          where: { userId: requestingUserId },
          select: { reactionType: true },
        },
        _count: { select: { reactions: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return { posts, total };
};

export const getPublicFeed = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  const posts = await prisma.post.findMany({
    where: { privacy: Privacy.PUBLIC },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: {
      user: { select: { id: true, name: true, bio: true } },
      _count: { select: { reactions: true } },
    },
  });
  const total = await prisma.post.count({ where: { privacy: Privacy.PUBLIC } });
  return { posts, total };
};
