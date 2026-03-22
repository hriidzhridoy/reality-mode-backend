import { Privacy } from "@prisma/client";
import prisma from "../utils/prisma";

// ─────────────────────────────────────────
// PRIVACY FILTER BUILDER
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// CREATE POST
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// GET PERSONALIZED FEED (authenticated)
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// GET PUBLIC FEED (unauthenticated)
// ─────────────────────────────────────────
export const getPublicFeed = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { privacy: Privacy.PUBLIC },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, bio: true } },
        _count: { select: { reactions: true } },
      },
    }),
    prisma.post.count({ where: { privacy: Privacy.PUBLIC } }),
  ]);

  return { posts, total };
};

// ─────────────────────────────────────────
// GET POSTS BY A SPECIFIC USER (profile page)
// ─────────────────────────────────────────
export const getUserPosts = async (
  profileUserId: string,
  requestingUserId: string | undefined,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;

  // Determine which privacy levels the requesting user can see
  let privacyCondition: object;

  if (!requestingUserId) {
    // Unauthenticated visitor — public only
    privacyCondition = { privacy: Privacy.PUBLIC };
  } else if (requestingUserId === profileUserId) {
    // Own profile — see everything including private posts
    privacyCondition = {};
  } else {
    // Someone else's profile — check if they're in the owner's circle
    const inCircle = await prisma.closeCircle.findUnique({
      where: {
        ownerId_memberId: {
          ownerId: profileUserId,
          memberId: requestingUserId,
        },
      },
    });

    // If in circle: public + close_circle. If not: public only
    privacyCondition = inCircle
      ? { privacy: { in: [Privacy.PUBLIC, Privacy.CLOSE_CIRCLE] } }
      : { privacy: Privacy.PUBLIC };
  }

  const where = { userId: profileUserId, ...privacyCondition };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, bio: true } },
        // Only include the requesting user's own reaction if authenticated
        ...(requestingUserId && {
          reactions: {
            where: { userId: requestingUserId },
            select: { reactionType: true },
          },
        }),
        _count: { select: { reactions: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return { posts, total };
};

// ─────────────────────────────────────────
// GET SINGLE POST BY ID
// ─────────────────────────────────────────
export const getPostById = async (
  postId: string,
  requestingUserId?: string,
) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: { select: { id: true, name: true, bio: true } },
      ...(requestingUserId && {
        reactions: {
          where: { userId: requestingUserId },
          select: { reactionType: true },
        },
      }),
      _count: { select: { reactions: true } },
    },
  });

  if (!post) throw new Error("POST_NOT_FOUND");

  // PRIVATE — only the owner can see it
  if (post.privacy === Privacy.PRIVATE) {
    if (post.userId !== requestingUserId) {
      throw new Error("POST_NOT_FOUND"); // 404 not 403 — don't reveal it exists
    }
  }

  // CLOSE_CIRCLE — owner or circle members only
  if (post.privacy === Privacy.CLOSE_CIRCLE) {
    if (post.userId !== requestingUserId) {
      if (!requestingUserId) throw new Error("POST_NOT_FOUND");

      const inCircle = await prisma.closeCircle.findUnique({
        where: {
          ownerId_memberId: {
            ownerId: post.userId,
            memberId: requestingUserId,
          },
        },
      });

      if (!inCircle) throw new Error("POST_NOT_FOUND");
    }
  }

  return post;
};

// ─────────────────────────────────────────
// UPDATE POST
// ─────────────────────────────────────────
export const updatePost = async (
  postId: string,
  userId: string,
  data: { highlight?: string; reality?: string; privacy?: Privacy },
) => {
  // First verify the post exists and belongs to this user
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error("POST_NOT_FOUND");
  if (post.userId !== userId) throw new Error("FORBIDDEN");

  // Build update object — only include fields that were actually sent
  const updateData: {
    highlight?: string;
    reality?: string;
    privacy?: Privacy;
  } = {};

  if (data.highlight !== undefined) {
    if (!data.highlight.trim()) throw new Error("HIGHLIGHT_REQUIRED");
    updateData.highlight = data.highlight.trim();
  }

  if (data.reality !== undefined) {
    if (!data.reality.trim()) throw new Error("REALITY_REQUIRED");
    updateData.reality = data.reality.trim();
  }

  if (data.privacy !== undefined) {
    updateData.privacy = data.privacy;
  }

  return prisma.post.update({
    where: { id: postId },
    data: updateData,
    include: {
      user: { select: { id: true, name: true, bio: true } },
      _count: { select: { reactions: true } },
    },
  });
};

// ─────────────────────────────────────────
// DELETE POST
// ─────────────────────────────────────────
export const deletePost = async (postId: string, userId: string) => {
  // Verify post exists and belongs to this user before deleting
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error("POST_NOT_FOUND");
  if (post.userId !== userId) throw new Error("FORBIDDEN");

  await prisma.post.delete({ where: { id: postId } });
  // Returns nothing — controller sends null data on success
};
