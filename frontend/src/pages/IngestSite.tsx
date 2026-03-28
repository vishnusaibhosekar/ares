/**
 * Ingest Site Page
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Copy, Check, ExternalLink } from 'lucide-react';
import { ingestSite } from '../lib/api';
import type { IngestSiteResponse, EntityInput } from '../lib/types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';

export function IngestSite() {
    const [url, setUrl] = useState('');
    const [pageText, setPageText] = useState('');
    const [emails, setEmails] = useState('');
    const [phones, setPhones] = useState('');
    const [attemptResolve, setAttemptResolve] = useState(true);
    const [useLLM, setUseLLM] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<IngestSiteResponse | null>(null);
    const [copied, setCopied] = useState(false);

    // Auto-extract domain from URL
    const getDomain = (url: string): string => {
        try {
            const parsed = new URL(url);
            return parsed.hostname;
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

            // Parse emails (comma or newline separated)
            if (emails.trim()) {
                entities.emails = emails.split(/[,\n]/).map(e => e.trim()).filter(Boolean);
            }

            // Parse phones (comma or newline separated)
            if (phones.trim()) {
                entities.phones = phones.split(/[,\n]/).map(p => p.trim()).filter(Boolean);
            }

            const response = await ingestSite({
                url,
                domain: getDomain(url),
                page_text: pageText || undefined,
                entities: Object.keys(entities).length > 0 ? entities : undefined,
                attempt_resolve: attemptResolve,
                use_llm_extraction: useLLM,
            });

            setResult(response);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to ingest site');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Ingest Site</h1>
                <p className="text-gray-600 mt-1">
                    Add a suspicious storefront for entity extraction and analysis
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

                {/* Page Text */}
                <div>
                    <label htmlFor="pageText" className="block text-sm font-medium text-gray-700 mb-1">
                        Page Text (optional)
                    </label>
                    <textarea
                        id="pageText"
                        value={pageText}
                        onChange={(e) => setPageText(e.target.value)}
                        placeholder="Paste the page content or policy text here..."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                </div>

                {/* Manual Entity Input */}
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
                        <p className="text-xs text-gray-500 mt-1">One per line or comma-separated</p>
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
                        <p className="text-xs text-gray-500 mt-1">One per line or comma-separated</p>
                    </div>
                </div>

                {/* Options */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={attemptResolve}
                            onChange={(e) => setAttemptResolve(e.target.checked)}
                            className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                        />
                        <span className="text-sm text-gray-700">Attempt resolution after ingest</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={useLLM}
                            onChange={(e) => setUseLLM(e.target.checked)}
                            className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                        />
                        <span className="text-sm text-gray-700">Use LLM extraction</span>
                    </label>
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
                        <Upload className="w-5 h-5" />
                    )}
                    {loading ? 'Ingesting...' : 'Ingest Site'}
                </button>
            </form>

            {/* Result Display */}
            {result && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-green-50 border-b border-green-200">
                        <h2 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            Site Ingested Successfully
                        </h2>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Site ID */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Site ID</p>
                                <p className="font-mono text-sm text-gray-900">{result.site_id}</p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(result.site_id)}
                                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-600">Entities Extracted</p>
                                <p className="text-2xl font-bold text-gray-900">{result.entities_extracted}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-600">Embeddings Generated</p>
                                <p className="text-2xl font-bold text-gray-900">{result.embeddings_generated}</p>
                            </div>
                        </div>

                        {/* Resolution Result */}
                        {result.resolution && (
                            <div className="border-t border-gray-200 pt-4 mt-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Resolution Result</h3>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Matched Cluster</span>
                                        <Link
                                            to={`/clusters/${result.resolution.cluster_id}`}
                                            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                                        >
                                            {result.resolution.cluster_id.slice(0, 8)}...
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-gray-600">Confidence</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {(result.resolution.confidence * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-brand-500 transition-all"
                                                style={{ width: `${result.resolution.confidence * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-600 mb-2">Matching Signals</p>
                                        <div className="flex flex-wrap gap-2">
                                            {result.resolution.matching_signals.map((signal, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-1 bg-brand-100 text-brand-700 text-xs font-medium rounded"
                                                >
                                                    {signal}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Explanation</p>
                                        <p className="text-sm text-gray-800">{result.resolution.explanation}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default IngestSite;
