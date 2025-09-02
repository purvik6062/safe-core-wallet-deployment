import { Request, Response, NextFunction } from "express";
import { MongoError } from "mongodb";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import logger from "../config/logger.js";

// Custom error interface
interface CustomError extends Error {
  statusCode?: number;
  code?: string | number;
  errors?: any;
}

interface ErrorResponse {
  success: false;
  error: string;
  stack?: string;
  timestamp: string;
  path: string;
  method: string;
}

/**
 * Global error handling middleware
 */
const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error: { message: string; statusCode: number } = {
    message: err.message || "Internal Server Error",
    statusCode: 500,
  };

  // Log error
  logger.error("Error Handler:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // MongoDB ObjectId validation error
  if (err.name === "BSONTypeError" || err.message?.includes("ObjectId")) {
    const message = "Invalid ID format";
    error = { message, statusCode: 400 };
  }

  // MongoDB duplicate key error
  if ((err as MongoError).code === 11000) {
    const message = "Duplicate field value entered";
    error = { message, statusCode: 400 };
  }

  // MongoDB validation errors from our custom validation
  if (
    err.message &&
    (err.message.includes("required") ||
      err.message.includes("Invalid") ||
      err.message.includes("format"))
  ) {
    error = { message: err.message, statusCode: 400 };
  }

  // JWT errors
  if (err instanceof JsonWebTokenError) {
    const message = "Invalid token";
    error = { message, statusCode: 401 };
  }

  if (err instanceof TokenExpiredError) {
    const message = "Token expired";
    error = { message, statusCode: 401 };
  }

  // Ethereum/blockchain errors
  if (err.code === "NETWORK_ERROR" || err.code === "TIMEOUT") {
    const message = "Blockchain network error";
    error = { message, statusCode: 503 };
  }

  if (err.code === "INSUFFICIENT_FUNDS") {
    const message = "Insufficient funds for transaction";
    error = { message, statusCode: 400 };
  }

  // Safe SDK specific errors
  if (err.message && err.message.includes("Safe")) {
    if (err.message.includes("already deployed")) {
      error = { message: err.message, statusCode: 409 };
    } else if (err.message.includes("not found")) {
      error = { message: err.message, statusCode: 404 };
    }
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";

  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
