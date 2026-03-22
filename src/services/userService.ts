import prisma from "../utils/prisma";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────
// GET OWN FULL PROFILE (private — includes email)
// ─────────────────────────────────────────
export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true, // included — this is for the logged-in user only
      bio: true,
      createdAt: true,
      _count: {
        select: {
          posts: true,
          closeCircle: true, // how many people they've added to their circle
        },
      },
    },
  });

  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
};

// ─────────────────────────────────────────
// GET PUBLIC PROFILE (safe — no email)
// ─────────────────────────────────────────
export const getPublicProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      // email intentionally excluded
      bio: true,
      createdAt: true,
      _count: {
        select: {
          posts: true, // only post count is public
        },
      },
    },
  });

  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
};

// ─────────────────────────────────────────
// UPDATE PROFILE (name and bio only)
// ─────────────────────────────────────────
export const updateProfile = async (
  userId: string,
  data: { name?: string; bio?: string },
) => {
  // Strip undefined fields so we don't accidentally null out
  // fields the user didn't intend to change
  const updateData: { name?: string; bio?: string | null } = {};

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.bio !== undefined) updateData.bio = data.bio.trim() || null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      bio: true,
      createdAt: true,
    },
  });

  return user;
};

// ─────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  // Fetch user with password (not in normal selects)
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new Error("USER_NOT_FOUND");

  // Verify they know their current password before allowing change
  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw new Error("INVALID_CURRENT_PASSWORD");

  // Hash the new password
  const hashed = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  // Intentionally return nothing — controller sends null data on success
};

// ─────────────────────────────────────────
// SEARCH USERS
// ─────────────────────────────────────────
export const searchUsers = async (
  query: string,
  requestingUserId: string,
  limit = 10,
) => {
  const users = await prisma.user.findMany({
    where: {
      AND: [
        // Never return yourself in search results
        { id: { not: requestingUserId } },
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      bio: true,
      // email excluded from search results intentionally
    },
    take: limit,
    orderBy: { name: "asc" },
  });

  return users;
};
