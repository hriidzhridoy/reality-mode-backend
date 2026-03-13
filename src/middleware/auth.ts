import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { sendError } from "../utils/response";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      sendError(res, "Access token required", 401);
      return;
    }

    const token = authHeader.split(" ")[1];
    req.user = verifyAccessToken(token);
    next();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        sendError(res, "Access token expired", 401);
        return;
      }
    }
    sendError(res, "Invalid access token", 401);
  }
};

export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      req.user = verifyAccessToken(authHeader.split(" ")[1]);
    }
  } catch {
    // Silently ignore — user just won't be set
  }
  next();
};
