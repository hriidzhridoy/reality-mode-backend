import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from "../utils/jwt";

export const registerUser = async (
  name: string,
  email: string,
  password: string,
  bio?: string,
) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("EMAIL_EXISTS");

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, bio: bio || null },
    select: { id: true, name: true, email: true, bio: true, createdAt: true },
  });

  const payload = { userId: user.id, email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return { user, accessToken, refreshToken };
};

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("INVALID_CREDENTIALS");

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error("INVALID_CREDENTIALS");

  const payload = { userId: user.id, email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  const { password: _pwd, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
};

export const refreshAccessToken = async (refreshToken: string) => {
  const decoded = verifyRefreshToken(refreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const payload = { userId: decoded.userId, email: decoded.email };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  // Rotate: replace the old refresh token with a new one
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { token: newRefreshToken, expiresAt: getRefreshTokenExpiry() },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (refreshToken: string, userId: string) => {
  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken, userId },
  });
};
