/**
 * Authentication Context
 * Manages auth state across the app
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthUser, SignInRequest, SignUpRequest } from '../lib/types';
import { signIn as apiSignIn, signUp as apiSignUp, signOut as apiSignOut, getCurrentUser, setAuthToken, clearAuthToken } from '../lib/api';

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (credentials: SignInRequest) => Promise<void>;
    signUp: (data: SignUpRequest) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'ares_auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize auth state from stored token
    useEffect(() => {
        async function initAuth() {
            const token = localStorage.getItem(TOKEN_KEY);
            if (token) {
                setAuthToken(token);
                try {
                    const currentUser = await getCurrentUser();
                    setUser(currentUser);
                } catch (error) {
                    // Token invalid or expired
                    console.error('Failed to restore session:', error);
                    localStorage.removeItem(TOKEN_KEY);
                    clearAuthToken();
                }
            }
            setIsLoading(false);
        }
        initAuth();
    }, []);

    const signIn = useCallback(async (credentials: SignInRequest) => {
        const response = await apiSignIn(credentials);
        localStorage.setItem(TOKEN_KEY, response.accessToken);
        setAuthToken(response.accessToken);
        setUser(response.user);
    }, []);

    const signUp = useCallback(async (data: SignUpRequest) => {
        const response = await apiSignUp(data);
        if (response.accessToken) {
            localStorage.setItem(TOKEN_KEY, response.accessToken);
            setAuthToken(response.accessToken);
            setUser(response.user);
        }
    }, []);

    const signOut = useCallback(async () => {
        try {
            await apiSignOut();
        } catch (error) {
            // Ignore signout errors
        }
        localStorage.removeItem(TOKEN_KEY);
        clearAuthToken();
        setUser(null);
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
