/**
 * Cluster Details Page
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Globe,
    Mail,
    Phone,
    Hash,
    Shield,
    Calendar,
    Copy,
    Check
} from 'lucide-react';
import { getClusterDetails } from '../lib/api';
import type { ClusterDetailsResponse } from '../lib/types';
import { FullPageSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';

export function ClusterDetails() {
    const { id } = useParams<{ id: string }>();
    const [cluster, setCluster] = useState<ClusterDetailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!id) return;

        const loadCluster = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getClusterDetails(id);
                setCluster(data);
            } catch (err: any) {
                setError(err.response?.data?.error || err.message || 'Failed to load cluster');
            } finally {
                setLoading(false);
            }
        };

        loadCluster();
    }, [id]);

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getRiskLevel = (score: number): { label: string; color: string; bg: string } => {
        if (score >= 0.7) return { label: 'High', color: 'text-red-700', bg: 'bg-red-100' };
        if (score >= 0.4) return { label: 'Medium', color: 'text-yellow-700', bg: 'bg-yellow-100' };
        return { label: 'Low', color: 'text-green-700', bg: 'bg-green-100' };
    };

    const getEntityIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'email': return <Mail className="w-4 h-4" />;
            case 'phone': return <Phone className="w-4 h-4" />;
            default: return <Hash className="w-4 h-4" />;
        }
    };

    if (loading) {
        return <FullPageSpinner text="Loading cluster details..." />;
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
                <ErrorAlert message={error} />
            </div>
        );
    }

    if (!cluster) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>
                <ErrorAlert message="Cluster not found" />
            </div>
        );
    }

    const risk = getRiskLevel(cluster.risk_score);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Back Link */}
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </Link>

            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <Shield className="w-8 h-8 text-brand-600" />
                            <h1 className="text-2xl font-bold text-gray-900">
                                {cluster.cluster.name || 'Unnamed Cluster'}
                            </h1>
                        </div>

                        {/* Cluster ID */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm text-gray-500">ID:</span>
                            <code className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                {cluster.cluster.id}
                            </code>
                            <button
                                onClick={() => copyToClipboard(cluster.cluster.id)}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>

                        {cluster.cluster.description && (
                            <p className="text-gray-600">{cluster.cluster.description}</p>
                        )}
                    </div>

                    {/* Risk Score */}
                    <div className="flex flex-col items-center p-4 rounded-xl border border-gray-200">
                        <p className="text-sm font-medium text-gray-600 mb-1">Risk Score</p>
                        <div className={`px-4 py-2 rounded-lg ${risk.bg}`}>
                            <span className={`text-2xl font-bold ${risk.color}`}>
                                {(cluster.risk_score * 100).toFixed(0)}%
                            </span>
                        </div>
                        <span className={`text-sm font-medium mt-1 ${risk.color}`}>
                            {risk.label} Risk
                        </span>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
                    <div>
                        <p className="text-sm text-gray-500">Confidence</p>
                        <p className="text-lg font-semibold text-gray-900">
                            {(cluster.cluster.confidence * 100).toFixed(1)}%
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Sites</p>
                        <p className="text-lg font-semibold text-gray-900">{cluster.sites.length}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Unique Entities</p>
                        <p className="text-lg font-semibold text-gray-900">{cluster.total_unique_entities}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Resolution Runs</p>
                        <p className="text-lg font-semibold text-gray-900">{cluster.resolution_runs}</p>
                    </div>
                </div>
            </div>

            {/* Sites Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-gray-500" />
                        Sites in Cluster ({cluster.sites.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Domain</th>
                                <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">URL</th>
                                <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">First Seen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {cluster.sites.map((site) => (
                                <tr key={site.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-gray-900">{site.domain}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a
                                            href={site.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand-600 hover:text-brand-700 text-sm truncate max-w-xs block"
                                        >
                                            {site.url}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(site.first_seen_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Entities Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Hash className="w-5 h-5 text-gray-500" />
                        Shared Entities ({cluster.entities.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Type</th>
                                <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Value</th>
                                <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Normalized</th>
                                <th className="text-right px-6 py-3 text-sm font-medium text-gray-600">Sites Using</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {cluster.entities.map((entity, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full uppercase">
                                            {getEntityIcon(entity.type)}
                                            {entity.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm text-gray-900">
                                        {entity.value}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm text-gray-500">
                                        {entity.normalized_value || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${entity.sites_using >= 3
                                            ? 'bg-red-100 text-red-700'
                                            : entity.sites_using >= 2
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-gray-100 text-gray-700'
                                            }`}>
                                            {entity.sites_using} site{entity.sites_using !== 1 ? 's' : ''}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Metadata */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                    <div>
                        <span className="font-medium">Created:</span>{' '}
                        {new Date(cluster.cluster.created_at).toLocaleString()}
                    </div>
                    <div>
                        <span className="font-medium">Updated:</span>{' '}
                        {new Date(cluster.cluster.updated_at).toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClusterDetails;
