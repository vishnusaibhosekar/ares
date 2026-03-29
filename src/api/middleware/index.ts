// src/api/middleware/index.ts
// Export all middleware

export { authMiddleware, optionalAuthMiddleware } from './auth';
export {
    errorHandler,
    notFoundHandler,
    AppError,
    ValidationError,
    NotFoundError,
    ConflictError,
    ForbiddenError,
    type ErrorResponse,
} from './error-handler';
export { loggerMiddleware, getRequestId, type RequestWithId } from './logger';
