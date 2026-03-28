/**
 * Custom API Hook for ARES Frontend
 * Handles loading, error, and data states for API calls
 */

import { useState, useCallback } from 'react';
import { getErrorMessage } from '../lib/api';

export interface UseApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

export interface UseApiActions<T, P = void> {
    execute: P extends void ? () => Promise<T | null> : (params: P) => Promise<T | null>;
    reset: () => void;
    setData: (data: T | null) => void;
}

export type UseApiResult<T, P = void> = UseApiState<T> & UseApiActions<T, P>;

/**
 * Custom hook for making API calls with loading and error states
 * 
 * @param apiFunction - The API function to call
 * @returns Object with data, loading, error states and execute function
 * 
 * @example
 * const { data, loading, error, execute } = useApi(api.checkHealth);
 * 
 * @example with params
 * const { data, loading, error, execute } = useApi(api.ingestSite);
 * await execute({ url: 'https://example.com' });
 */
export function useApi<T, P = void>(
    apiFunction: P extends void ? () => Promise<T> : (params: P) => Promise<T>
): UseApiResult<T, P> {
    const [state, setState] = useState<UseApiState<T>>({
        data: null,
        loading: false,
        error: null,
    });

    const execute = useCallback(
        async (params?: P): Promise<T | null> => {
            setState((prev) => ({ ...prev, loading: true, error: null }));

            try {
                const result = params !== undefined
                    ? await (apiFunction as (params: P) => Promise<T>)(params)
                    : await (apiFunction as () => Promise<T>)();

                setState({ data: result, loading: false, error: null });
                return result;
            } catch (error) {
                const message = getErrorMessage(error);
                setState((prev) => ({ ...prev, loading: false, error: message }));
                return null;
            }
        },
        [apiFunction]
    );

    const reset = useCallback(() => {
        setState({ data: null, loading: false, error: null });
    }, []);

    const setData = useCallback((data: T | null) => {
        setState((prev) => ({ ...prev, data }));
    }, []);

    return {
        ...state,
        execute: execute as UseApiActions<T, P>['execute'],
        reset,
        setData,
    };
}

/**
 * Hook for making one-time API calls on mount
 */
export function useApiOnMount<T>(
    apiFunction: () => Promise<T>
): UseApiState<T> {
    const { data, loading, error, execute } = useApi<T>(apiFunction);

    // Execute on mount and when deps change
    useState(() => {
        execute();
    });

    return { data, loading, error };
}

export default useApi;
