/**
 * Layout Component
 */

import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

export function Layout() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navigation />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>
            <footer className="border-t border-gray-200 py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm text-gray-500">
                        ARES - Actor Resolution & Entity Service | Insforge x Qoder Hackathon
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default Layout;
