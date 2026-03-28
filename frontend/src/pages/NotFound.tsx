/**
 * Not Found Page
 */

import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export function NotFound() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
            <p className="text-gray-600 mb-8 max-w-md">
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors"
            >
                <Home className="w-5 h-5" />
                Back to Dashboard
            </Link>
        </div>
    );
}

export default NotFound;
