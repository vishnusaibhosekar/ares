// src/service/AuthService.ts
// Authentication service using Insforge REST API

import axios, { AxiosInstance, AxiosError } from 'axios';

interface AuthUser {
    id: string;
    email: string;
    emailVerified: boolean;
    profile?: {
        name?: string;
    };
}

interface AuthResponse {
    user: AuthUser;
    accessToken: string;
}

interface AuthError {
    statusCode: number;
    error: string;
    message: string;
}

/**
 * AuthService - Handles authentication via Insforge REST API
 */
export class AuthService {
    private static instance: AuthService | null = null;
    private httpClient: AxiosInstance;
    private baseUrl: string;
    private anonKey: string;

    private constructor(baseUrl: string, anonKey: string) {
        this.baseUrl = baseUrl;
        this.anonKey = anonKey;
        this.httpClient = axios.create({
            baseURL: baseUrl,
            headers: {
                'apikey': anonKey,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    }

    /**
     * Get or create the singleton instance
     */
    static getInstance(baseUrl?: string, anonKey?: string): AuthService {
        if (!AuthService.instance) {
            const url = baseUrl || process.env.INSFORGE_BASE_URL;
            const key = anonKey || process.env.INSFORGE_ANON_KEY;
            if (!url || !key) {
                throw new Error('Insforge baseUrl and anonKey required for AuthService');
            }
            AuthService.instance = new AuthService(url, key);
        }
        return AuthService.instance;
    }

    /**
     * Sign up a new user
     * Uses Insforge endpoint: POST /api/auth/users
     */
    async signUp(email: string, password: string, name?: string): Promise<AuthResponse> {
        try {
            const response = await this.httpClient.post<{ accessToken: string | null; requireEmailVerification: boolean }>('/api/auth/users', {
                email,
                password,
                name,
            });
            
            // If email verification required, user was created but can't login yet
            if (response.data.requireEmailVerification && !response.data.accessToken) {
                throw new Error('Email verification required. Please check your email.');
            }
            
            // Return user info with token
            return {
                user: {
                    id: '',
                    email,
                    emailVerified: !response.data.requireEmailVerification,
                    profile: { name },
                },
                accessToken: response.data.accessToken || '',
            };
        } catch (error) {
            const axiosError = error as AxiosError<AuthError>;
            const message = axiosError.response?.data?.message || (error instanceof Error ? error.message : axiosError.message);
            throw new Error(`Sign up failed: ${message}`);
        }
    }

    /**
     * Sign in with email and password
     * Uses Insforge endpoint: POST /api/auth/sessions
     */
    async signIn(email: string, password: string): Promise<AuthResponse> {
        try {
            const response = await this.httpClient.post<AuthResponse>('/api/auth/sessions', {
                email,
                password,
            });
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<AuthError>;
            const message = axiosError.response?.data?.message || axiosError.message;
            throw new Error(`Sign in failed: ${message}`);
        }
    }

    /**
     * Get current user from access token
     * Uses Insforge endpoint: GET /api/auth/sessions/me
     */
    async getCurrentUser(accessToken: string): Promise<AuthUser> {
        try {
            const response = await this.httpClient.get<{ user: AuthUser }>('/api/auth/sessions/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            return response.data.user;
        } catch (error) {
            const axiosError = error as AxiosError<AuthError>;
            const message = axiosError.response?.data?.message || axiosError.message;
            throw new Error(`Get user failed: ${message}`);
        }
    }

    /**
     * Validate an access token by fetching user info
     */
    async validateToken(accessToken: string): Promise<AuthUser | null> {
        try {
            return await this.getCurrentUser(accessToken);
        } catch {
            return null;
        }
    }

    /**
     * Sign out (invalidate token on server)
     * Uses Insforge endpoint: DELETE /api/auth/sessions
     */
    async signOut(accessToken: string): Promise<void> {
        try {
            await this.httpClient.delete('/api/auth/sessions', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
        } catch (error) {
            // Sign out errors are non-critical
            console.warn('Sign out warning:', error);
        }
    }
}

export default AuthService;
