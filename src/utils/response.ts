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

export const parsePagination = (
  page?: string | string[], // ← accept both types
  limit?: string | string[], // ← accept both types
) => {
  // If it's an array (e.g. ?page=1&page=2), just take the first value
  const rawPage = Array.isArray(page) ? page[0] : page;
  const rawLimit = Array.isArray(limit) ? limit[0] : limit;

  const parsedPage = Math.max(1, parseInt(rawPage || "1") || 1);
  const parsedLimit = Math.min(
    50,
    Math.max(1, parseInt(rawLimit || "20") || 20),
  );

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};
