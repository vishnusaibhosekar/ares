/**
 * API Client for ARES Backend
 */

import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';
import type {
    HealthResponse,
    IngestSiteRequest,
    IngestSiteResponse,
    ResolveActorRequest,
    ResolveActorResponse,
    ClusterDetailsResponse,
    SeedDataRequest,
    SeedDataResponse,
    ApiErrorResponse,
    SignInRequest,
    SignUpRequest,
    AuthResponse,
    AuthUser,
} from './types';

// API base URL from environment
// In production (Vercel), use empty string for same-origin requests
// In development, use the Vite proxy (no base URL needed)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Create axios instance with default config
 */
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds
});

// Store for auth token
let authToken: string | null = null;

/**
 * Set auth token for API requests
 */
export function setAuthToken(token: string): void {
    authToken = token;
}

/**
 * Clear auth token
 */
export function clearAuthToken(): void {
    authToken = null;
}

// Request interceptor for logging and auth
apiClient.interceptors.request.use((config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);

    // Add auth token if available
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }

    return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorResponse>) => {
        const message = error.response?.data?.error || error.message || 'Unknown error';
        console.error(`[API Error] ${message}`, error.response?.data);
        return Promise.reject(error);
    }
);

/**
 * API Functions
 */

export async function checkHealth(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
}

export async function ingestSite(data: IngestSiteRequest): Promise<IngestSiteResponse> {
    const response = await apiClient.post<IngestSiteResponse>('/api/ingest-site', data);
    return response.data;
}

export async function resolveActor(data: ResolveActorRequest): Promise<ResolveActorResponse> {
    const response = await apiClient.post<ResolveActorResponse>('/api/resolve-actor', data);
    return response.data;
}

export async function getClusterDetails(clusterId: string): Promise<ClusterDetailsResponse> {
    const response = await apiClient.get<ClusterDetailsResponse>(`/api/clusters/${clusterId}`);
    return response.data;
}

export async function seedDatabase(data: SeedDataRequest = {}): Promise<SeedDataResponse> {
    const response = await apiClient.post<SeedDataResponse>('/api/seeds', {
        count: data.count ?? 10,
        include_matches: data.include_matches ?? true,
    });
    return response.data;
}

// ============================================
// Authentication API
// ============================================

export async function signIn(data: SignInRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/signin', data);
    return response.data;
}

export async function signUp(data: SignUpRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/signup', data);
    return response.data;
}

export async function signOut(): Promise<void> {
    await apiClient.post('/api/auth/signout');
}

export async function getCurrentUser(): Promise<AuthUser> {
    const response = await apiClient.get<{ user: AuthUser }>('/api/auth/me');
    return response.data.user;
}

/**
 * Helper to extract error message from API error
 */
export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        return axiosError.response?.data?.error || axiosError.message || 'Request failed';
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'Unknown error occurred';
}

export { apiClient };
export default apiClient;
