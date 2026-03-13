import prisma from "../utils/prisma";

export const addToCircle = async (ownerId: string, memberId: string) => {
  if (ownerId === memberId) throw new Error("CANNOT_ADD_SELF");

  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("USER_NOT_FOUND");

  const existing = await prisma.closeCircle.findUnique({
    where: { ownerId_memberId: { ownerId, memberId } },
  });
  if (existing) throw new Error("ALREADY_IN_CIRCLE");

  return prisma.closeCircle.create({
    data: { ownerId, memberId },
    include: { member: { select: { id: true, name: true, bio: true } } },
  });
};

export const removeFromCircle = async (ownerId: string, memberId: string) => {
  const entry = await prisma.closeCircle.findUnique({
    where: { ownerId_memberId: { ownerId, memberId } },
  });
  if (!entry) throw new Error("NOT_IN_CIRCLE");

  await prisma.closeCircle.delete({
    where: { ownerId_memberId: { ownerId, memberId } },
  });
};

export const getMyCircle = async (
  ownerId: string,
  page: number,
  limit: number,
) => {
  const skip = (page - 1) * limit;
  const [members, total] = await Promise.all([
    prisma.closeCircle.findMany({
      where: { ownerId },
      skip,
      take: limit,
      include: { member: { select: { id: true, name: true, bio: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.closeCircle.count({ where: { ownerId } }),
  ]);
  return { members: members.map((m) => m.member), total };
};
