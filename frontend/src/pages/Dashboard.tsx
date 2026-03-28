/**
 * Dashboard Page
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Globe,
    Users,
    Activity,
    Plus,
    Search,
    RefreshCw,
    AlertTriangle,
    Check
} from 'lucide-react';
import { checkHealth, seedDatabase } from '../lib/api';
import type { HealthResponse, SeedDataResponse } from '../lib/types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert, SuccessAlert } from '../components/ErrorAlert';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
    className?: string;
}

function StatCard({ title, value, icon, description, className = '' }: StatCardProps) {
    return (
        <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    {description && (
                        <p className="text-sm text-gray-500 mt-1">{description}</p>
                    )}
                </div>
                <div className="p-3 bg-brand-50 rounded-lg">
                    {icon}
                </div>
            </div>
        </div>
    );
}

export function Dashboard() {
    const [health, setHealth] = useState<HealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [seeding, setSeeding] = useState(false);
    const [seedResult, setSeedResult] = useState<SeedDataResponse | null>(null);

    const loadHealth = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await checkHealth();
            setHealth(data);
        } catch (err) {
            setError('Failed to connect to API');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHealth();
    }, []);

    const handleSeedDatabase = async () => {
        setSeeding(true);
        setSeedResult(null);
        try {
            const result = await seedDatabase({ count: 10, include_matches: true });
            setSeedResult(result);
        } catch (err) {
            setError('Failed to seed database');
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">ARES Dashboard</h1>
                    <p className="text-gray-600 mt-1">
                        Actor Resolution & Entity Service
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadHealth}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={handleSeedDatabase}
                        disabled={seeding}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                    >
                        {seeding ? (
                            <LoadingSpinner size="sm" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        Seed Demo Data
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <ErrorAlert message={error} onDismiss={() => setError(null)} />
            )}
            {seedResult && (
                <SuccessAlert
                    message={`Seeded ${seedResult.sites_created} sites, ${seedResult.entities_created} entities, ${seedResult.clusters_created} clusters`}
                    onDismiss={() => setSeedResult(null)}
                />
            )}

            {/* Health Status */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <LoadingSpinner text="Checking API health..." />
                </div>
            ) : (
                <>
                    {/* API Status Banner */}
                    <div className={`rounded-xl p-4 flex items-center gap-3 ${health?.status === 'ok'
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-yellow-50 border border-yellow-200'
                        }`}>
                        {health?.status === 'ok' ? (
                            <Check className="w-5 h-5 text-green-600" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        )}
                        <div>
                            <p className={`font-medium ${health?.status === 'ok' ? 'text-green-800' : 'text-yellow-800'
                                }`}>
                                API Status: {health?.status?.toUpperCase() || 'Unknown'}
                            </p>
                            <p className={`text-sm ${health?.status === 'ok' ? 'text-green-600' : 'text-yellow-600'
                                }`}>
                                Database: {health?.database || 'unknown'} |
                                Embeddings: {health?.embeddings || 'unknown'}
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="System Status"
                            value={health?.status === 'ok' ? 'Operational' : 'Degraded'}
                            icon={<Activity className="w-6 h-6 text-brand-600" />}
                            description="All services running"
                        />
                        <StatCard
                            title="Database"
                            value={health?.database === 'connected' ? 'Connected' : 'Disconnected'}
                            icon={<Globe className="w-6 h-6 text-brand-600" />}
                            description="PostgreSQL + Drizzle"
                        />
                        <StatCard
                            title="Embedding Service"
                            value={health?.embeddings || 'Ready'}
                            icon={<Users className="w-6 h-6 text-brand-600" />}
                            description="Mixedbread AI"
                        />
                    </div>
                </>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link
                        to="/ingest"
                        className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                    >
                        <div className="p-3 bg-brand-100 rounded-lg">
                            <Plus className="w-6 h-6 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">Ingest New Site</h3>
                            <p className="text-sm text-gray-600">Add a suspicious storefront for analysis</p>
                        </div>
                    </Link>
                    <Link
                        to="/resolve"
                        className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                    >
                        <div className="p-3 bg-brand-100 rounded-lg">
                            <Search className="w-6 h-6 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900">Resolve Actor</h3>
                            <p className="text-sm text-gray-600">Identify operator behind a domain</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* About Section */}
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-8 text-white">
                <h2 className="text-xl font-bold mb-2">About ARES</h2>
                <p className="text-brand-100 leading-relaxed">
                    ARES (Actor Resolution & Entity Service) identifies the operators behind counterfeit storefronts
                    by analyzing shared contact information, policy text similarity, and entity patterns.
                    Built with Qoder (agentic development) and Insforge (agent-native backend) for the hackathon.
                </p>
            </div>
        </div>
    );
}

export default Dashboard;
