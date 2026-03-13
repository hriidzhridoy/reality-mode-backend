import { Response } from "express";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
) => {
  return res.status(statusCode).json({ success: true, data, message });
};

export const sendCreated = <T>(res: Response, data: T, message?: string) => {
  return sendSuccess(res, data, message, 201);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: object[],
) => {
  return res.status(statusCode).json({ success: false, message, errors });
};

export const parsePagination = (page?: string, limit?: string) => {
  const parsedPage = Math.max(1, parseInt(page || "1") || 1);
  const parsedLimit = Math.min(50, Math.max(1, parseInt(limit || "20") || 20));
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};
