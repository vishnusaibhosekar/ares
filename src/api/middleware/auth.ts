// src/api/middleware/auth.ts
// Authentication middleware

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../service/AuthService';

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
            };
        }
    }
}

/**
 * Authentication middleware - validates Bearer token
 * Attaches user to request if valid
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided. Include Authorization: Bearer <token> header.'
            });
            return;
        }

        const token = authHeader.substring(7);

        // Validate token via AuthService
        const authService = AuthService.getInstance();
        const user = await authService.validateToken(token);

        if (!user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
            return;
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
        };

        next();
    } catch (error) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication failed'
        });
    }
}

/**
 * Optional auth middleware - doesn't require auth but attaches user if present
 */
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const authService = AuthService.getInstance();
            const user = await authService.validateToken(token);

            if (user) {
                req.user = {
                    id: user.id,
                    email: user.email,
                };
            }
        }

        next();
    } catch {
        // Continue without user on error
        next();
    }
}

export default authMiddleware;
