import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";

export const notFound = (req: Request, res: Response): void => {
  sendError(res, `Route not found: ${req.originalUrl}`, 404);
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error("Unhandled error:", err);
  sendError(
    res,
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
    500,
  );
};
