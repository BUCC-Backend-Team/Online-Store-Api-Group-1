import { Response } from 'express';

// Uniform envelope for every API response:
//   success: { success: true,  message, data }
//   error:   { success: false, message, data }
// `data` is the payload object, or null when a route returns nothing.
// Error bodies come from ApiError#toResponse() and the central error handler
// in server.ts; sendError exists for direct error replies (404, health 503).

export type ApiErrorData = Record<string, unknown> | null;

// Send a success envelope: { success: true, message, data }.
export function sendSuccess<T>(
  res: Response,
  status: number,
  message: string,
  data: T,
): void {
  res.status(status).json({ success: true, message, data });
}

// Send an error envelope: { success: false, message, data }.
export function sendError(
  res: Response,
  status: number,
  message: string,
  data: ApiErrorData = null,
): void {
  res.status(status).json({ success: false, message, data });
}
