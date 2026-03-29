// src/api/routes/auth.ts
// Authentication routes

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../../util/logger';
import { AuthService } from '../../service/AuthService';

const router = Router();

// Validation schemas
const signUpSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().optional(),
});

const signInSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate request body
        const validation = signUpSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: validation.error.errors,
            });
            return;
        }

        const { email, password, name } = validation.data;

        // Create user via AuthService
        const authService = AuthService.getInstance();
        const result = await authService.signUp(email, password, name);

        logger.info({ email }, 'User signed up');

        res.status(201).json({
            user: result.user,
            accessToken: result.accessToken,
        });
    } catch (error) {
        logger.error({ error }, 'Sign up failed');

        const message = error instanceof Error ? error.message : 'Sign up failed';
        res.status(400).json({ error: message });
    }
});

/**
 * POST /api/auth/signin
 * Sign in with email and password
 */
router.post('/signin', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Validate request body
        const validation = signInSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: validation.error.errors,
            });
            return;
        }

        const { email, password } = validation.data;

        // Sign in via AuthService
        const authService = AuthService.getInstance();
        const result = await authService.signIn(email, password);

        logger.info({ email }, 'User signed in');

        res.json({
            user: result.user,
            accessToken: result.accessToken,
        });
    } catch (error) {
        logger.error({ error }, 'Sign in failed');

        const message = error instanceof Error ? error.message : 'Invalid credentials';
        res.status(401).json({ error: message });
    }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7);

        // Validate token and get user
        const authService = AuthService.getInstance();
        const user = await authService.getCurrentUser(token);

        res.json({ user });
    } catch (error) {
        logger.error({ error }, 'Get current user failed');
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

/**
 * POST /api/auth/signout
 * Sign out and invalidate token
 */
router.post('/signout', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const authService = AuthService.getInstance();
            await authService.signOut(token);
        }

        res.json({ message: 'Signed out successfully' });
    } catch (error) {
        // Sign out errors are non-critical
        res.json({ message: 'Signed out' });
    }
});

export { router as authRouter };
export default router;
