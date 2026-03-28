/**
 * Resolve Actor Page
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ExternalLink, AlertTriangle, Check } from 'lucide-react';
import { resolveActor } from '../lib/api';
import type { ResolveActorResponse, EntityInput } from '../lib/types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';

export function ResolveActor() {
    const [url, setUrl] = useState('');
    const [pageText, setPageText] = useState('');
    const [emails, setEmails] = useState('');
    const [phones, setPhones] = useState('');
    const [siteId, setSiteId] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ResolveActorResponse | null>(null);

    const getDomain = (url: string): string => {
        try {
            return new URL(url).hostname;
        } catch {
            return '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const entities: EntityInput = {};

            if (emails.trim()) {
                entities.emails = emails.split(/[,\n]/).map(e => e.trim()).filter(Boolean);
            }

            if (phones.trim()) {
                entities.phones = phones.split(/[,\n]/).map(p => p.trim()).filter(Boolean);
            }

            const response = await resolveActor({
                url,
                domain: getDomain(url),
                page_text: pageText || undefined,
                entities: Object.keys(entities).length > 0 ? entities : undefined,
                site_id: siteId || undefined,
            });

            setResult(response);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to resolve actor');
        } finally {
            setLoading(false);
        }
    };

    const getConfidenceColor = (confidence: number): string => {
        if (confidence >= 0.8) return 'bg-green-500';
        if (confidence >= 0.5) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getConfidenceLabel = (confidence: number): string => {
        if (confidence >= 0.8) return 'High';
        if (confidence >= 0.5) return 'Medium';
        return 'Low';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Resolve Actor</h1>
                <p className="text-gray-600 mt-1">
                    Identify the operator behind a suspicious storefront
                </p>
            </div>

            {/* Error Alert */}
            {error && (
                <ErrorAlert message={error} onDismiss={() => setError(null)} />
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                {/* URL Input */}
                <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                        Site URL <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="url"
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://suspicious-store.example.com"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                    {url && getDomain(url) && (
                        <p className="text-sm text-gray-500 mt-1">Domain: {getDomain(url)}</p>
                    )}
                </div>

                {/* Site ID Lookup (optional) */}
                <div>
                    <label htmlFor="siteId" className="block text-sm font-medium text-gray-700 mb-1">
                        Site ID (optional - for lookup)
                    </label>
                    <input
                        type="text"
                        id="siteId"
                        value={siteId}
                        onChange={(e) => setSiteId(e.target.value)}
                        placeholder="UUID of previously ingested site"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono text-sm"
                    />
                </div>

                {/* Page Text */}
                <div>
                    <label htmlFor="pageText" className="block text-sm font-medium text-gray-700 mb-1">
                        Page Text / Policy Text (optional)
                    </label>
                    <textarea
                        id="pageText"
                        value={pageText}
                        onChange={(e) => setPageText(e.target.value)}
                        placeholder="Paste the page content, policy text, or terms here for semantic matching..."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                </div>

                {/* Entity Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="emails" className="block text-sm font-medium text-gray-700 mb-1">
                            Email Addresses
                        </label>
                        <textarea
                            id="emails"
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                            placeholder="support@example.com&#10;sales@example.com"
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="phones" className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Numbers
                        </label>
                        <textarea
                            id="phones"
                            value={phones}
                            onChange={(e) => setPhones(e.target.value)}
                            placeholder="+86 138 1234 5678&#10;+1 555 123 4567"
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || !url}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <LoadingSpinner size="sm" />
                    ) : (
                        <Search className="w-5 h-5" />
                    )}
                    {loading ? 'Resolving...' : 'Resolve Actor'}
                </button>
            </form>

            {/* Result Display */}
            {result && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className={`px-6 py-4 border-b ${result.actor_cluster_id
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                        <h2 className={`text-lg font-semibold flex items-center gap-2 ${result.actor_cluster_id ? 'text-green-800' : 'text-gray-800'
                            }`}>
                            {result.actor_cluster_id ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    Operator Cluster Identified
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="w-5 h-5" />
                                    No Matching Cluster Found
                                </>
                            )}
                        </h2>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Cluster ID */}
                        {result.actor_cluster_id && (
                            <div className="flex items-center justify-between p-4 bg-brand-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-brand-700">Actor Cluster ID</p>
                                    <p className="font-mono text-sm text-brand-900">{result.actor_cluster_id}</p>
                                </div>
                                <Link
                                    to={`/clusters/${result.actor_cluster_id}`}
                                    className="inline-flex items-center gap-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                                >
                                    View Cluster
                                    <ExternalLink className="w-4 h-4" />
                                </Link>
                            </div>
                        )}

                        {/* Confidence Score */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Confidence Score</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${result.confidence >= 0.8
                                        ? 'bg-green-100 text-green-700'
                                        : result.confidence >= 0.5
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-red-100 text-red-700'
                                    }`}>
                                    {getConfidenceLabel(result.confidence)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getConfidenceColor(result.confidence)} transition-all`}
                                        style={{ width: `${result.confidence * 100}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold text-gray-900 w-16 text-right">
                                    {(result.confidence * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* Matching Signals */}
                        {result.matching_signals.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Matching Signals</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.matching_signals.map((signal, i) => (
                                        <span
                                            key={i}
                                            className="px-3 py-1.5 bg-brand-100 text-brand-700 text-sm font-medium rounded-full"
                                        >
                                            {signal.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Related Domains */}
                        {result.related_domains.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    Related Domains ({result.related_domains.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {result.related_domains.map((domain, i) => (
                                        <span
                                            key={i}
                                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg border border-gray-200"
                                        >
                                            {domain}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Related Entities */}
                        {result.related_entities.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    Related Entities ({result.related_entities.length})
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-2 px-3 font-medium text-gray-600">Type</th>
                                                <th className="text-left py-2 px-3 font-medium text-gray-600">Value</th>
                                                <th className="text-right py-2 px-3 font-medium text-gray-600">Sites</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.related_entities.map((entity, i) => (
                                                <tr key={i} className="border-b border-gray-100">
                                                    <td className="py-2 px-3">
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded uppercase">
                                                            {entity.type}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 font-mono text-gray-900">{entity.value}</td>
                                                    <td className="py-2 px-3 text-right text-gray-600">{entity.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Explanation */}
                        <div className="pt-4 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-2">Analysis</p>
                            <p className="text-gray-600 leading-relaxed">{result.explanation}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ResolveActor;
