/**
 * Core Error Types
 * Typed error hierarchy for Up2Code modules.
 */

export class AppError extends Error {
    public readonly code: string;
    public readonly statusCode: number;

    constructor(message: string, code = 'INTERNAL_ERROR', statusCode = 500) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR', 400);
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 'NOT_FOUND', 404);
        this.name = 'NotFoundError';
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 'UNAUTHORIZED', 401);
        this.name = 'UnauthorizedError';
    }
}

export class ExternalServiceError extends AppError {
    constructor(service: string, message: string) {
        super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502);
        this.name = 'ExternalServiceError';
    }
}

export function isAppError(err: unknown): err is AppError {
    return err instanceof AppError;
}
