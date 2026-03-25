"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface LocatorResult {
    tag: string;
    locator: string;
}

interface AuthWarning {
    warning: string;
    redirectedTo: string;
    hint: string;
    loginError?: string;
    results: [];
}

export default function LocatorPageWrapper() {
    return (
        <Suspense fallback={<div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Loading locator...</div>}>
            <LocatorPage />
        </Suspense>
    );
}

function LocatorPage() {
    const { user, token, isGuest, isLoading } = useAuth();
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [keyword, setKeyword] = useState('');
    const [locatorType, setLocatorType] = useState('xpath');
    const [cookies, setCookies] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [siteUsername, setSiteUsername] = useState('');
    const [sitePassword, setSitePassword] = useState('');
    const [showAuth, setShowAuth] = useState(false);
    const [results, setResults] = useState<LocatorResult[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [authWarning, setAuthWarning] = useState<AuthWarning | null>(null);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!isLoading && !user && !isGuest) {
            router.push('/login');
        }
    }, [user, isGuest, isLoading, router]);

    // Parse URL parameters for "Re-run" functionality from history
    useEffect(() => {
        const rerunUrl = searchParams.get('url');
        const rerunKeyword = searchParams.get('keyword');
        const rerunType = searchParams.get('type');
        
        if (rerunUrl) setUrl(rerunUrl);
        if (rerunKeyword) setKeyword(rerunKeyword);
        if (rerunType) setLocatorType(rerunType);
    }, [searchParams]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setError('');
        setResults([]);
        setAuthWarning(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/locator/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    url, keyword, locatorType,
                    cookies: cookies || undefined,
                    authToken: authToken || undefined,
                    siteUsername: siteUsername || undefined,
                    sitePassword: sitePassword || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                if (data.warning) {
                    setAuthWarning(data);
                    setShowAuth(true);
                } else if (Array.isArray(data)) {
                    setResults(data);
                } else {
                    setResults([]);
                }
            } else {
                setError(data.message || 'Generation failed');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    const isMultiLine = locatorType === 'styles' || locatorType === 'outerhtml' || locatorType === 'element';

    if (isLoading || (!user && !isGuest)) return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Loading...</div>;

    const inputStyle = {
        background: 'var(--input-bg)',
        borderColor: 'var(--input-border)',
        color: 'var(--foreground)',
    };

    return (
        <DashboardLayout>
            <section className="card p-6 md:p-8">
                <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-semibold uppercase" style={{ color: 'var(--muted)' }}>Target URL</label>
                        <input
                            type="url"
                            required
                            placeholder="https://example.com"
                            className="block w-full border rounded-md p-2 text-sm focus:ring-1 focus:ring-amber-500 transition-all outline-none"
                            style={inputStyle}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase" style={{ color: 'var(--muted)' }}>Keyword</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Email"
                            className="block w-full border rounded-md p-2 text-sm focus:ring-1 focus:ring-amber-500 transition-all outline-none"
                            style={inputStyle}
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase" style={{ color: 'var(--muted)' }}>Copy As</label>
                        <select
                            className="block w-full border rounded-md p-2 text-sm focus:ring-1 focus:ring-amber-500 transition-all outline-none appearance-none"
                            style={inputStyle}
                            value={locatorType}
                            onChange={(e) => setLocatorType(e.target.value)}
                        >
                            <option value="xpath">XPath</option>
                            <option value="full_xpath">Full XPath</option>
                            <option value="selector">Selector</option>
                            <option value="js_path">JS Path</option>
                            <option value="outerhtml">OuterHTML</option>
                            <option value="element">Element</option>
                            <option value="styles">Styles</option>
                        </select>
                    </div>

                    {/* Auth toggle and inputs */}
                    <div className="md:col-span-4">
                        <button
                            type="button"
                            onClick={() => setShowAuth(!showAuth)}
                            className="text-xs text-amber-500 hover:text-amber-400 dark:text-amber-400 dark:hover:text-amber-300 transition-colors flex items-center gap-1 font-medium"
                        >
                            <span>{showAuth ? '▼' : '▶'}</span>
                            Authentication (for protected pages)
                        </button>
                        {showAuth && (
                            <div className="mt-4 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold uppercase" style={{ color: 'var(--muted)' }}>Site Username / Email</label>
                                        <input
                                            type="text"
                                            placeholder="your@email.com"
                                            className="block w-full border rounded-md p-2 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-sm"
                                            style={inputStyle}
                                            value={siteUsername}
                                            onChange={(e) => setSiteUsername(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold uppercase" style={{ color: 'var(--muted)' }}>Site Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="block w-full border rounded-md p-2 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-sm"
                                            style={inputStyle}
                                            value={sitePassword}
                                            onChange={(e) => setSitePassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                                    The tool will auto-fill and submit the login form if the site requires authentication.
                                </p>

                                <div className="pt-5 mt-4 border-t border-[var(--card-border)]">
                                    <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Advanced: use cookies or auth tokens instead</p>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold uppercase" style={{ color: 'var(--muted)' }}>Cookies</label>
                                            <textarea
                                                placeholder="Paste cookies from browser: F12 → Console → document.cookie"
                                                className="block w-full border rounded-md p-2 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-sm font-mono h-16 resize-y"
                                                style={inputStyle}
                                                value={cookies}
                                                onChange={(e) => setCookies(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold uppercase" style={{ color: 'var(--muted)' }}>Authorization Token</label>
                                            <textarea
                                                placeholder="Bearer eyJhbGciOiJIUzI1NiIs..."
                                                className="block w-full border rounded-md p-2 focus:ring-1 focus:ring-amber-500 transition-all outline-none text-sm font-mono h-16 resize-y"
                                                style={inputStyle}
                                                value={authToken}
                                                onChange={(e) => setAuthToken(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-4 mt-2">
                        <button
                            type="submit"
                            disabled={isGenerating}
                            className="btn-primary py-2 px-6 rounded-md text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                    Scanning Page...
                                </>
                            ) : 'Generate Locators'}
                        </button>
                    </div>
                </form>
            </section>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 dark:text-red-400 p-4 rounded-lg flex items-center justify-center mt-8">
                    {error}
                </div>
            )}

            {authWarning && (
                <div className={`mt-8 p-5 rounded-lg space-y-3 ${
                    authWarning.loginError
                        ? 'bg-red-500/10 border border-red-500/50'
                        : 'bg-amber-500/10 border border-amber-500/50'
                }`}>
                    <div className={`flex items-center gap-2 font-semibold ${
                        authWarning.loginError ? 'text-red-400 dark:text-red-300' : 'text-amber-500 dark:text-amber-300'
                    }`}>
                        <span className="text-lg">{authWarning.loginError ? '❌' : '🔒'}</span>
                        {authWarning.warning}
                    </div>
                    {authWarning.loginError && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-sm text-red-500 dark:text-red-300 font-medium">Site Error Message:</p>
                            <p className="text-sm text-red-400 dark:text-red-200 mt-1">{authWarning.loginError}</p>
                        </div>
                    )}
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        Redirected to: <code style={{ background: 'var(--code-bg)', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>{authWarning.redirectedTo}</code>
                    </p>
                    {!authWarning.loginError && (
                        <p className="text-sm text-amber-600 dark:text-amber-400/80">{authWarning.hint}</p>
                    )}
                </div>
            )}

            <section className="space-y-4 mt-8">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    Results
                    <span className="text-xs px-2 py-1 rounded-full uppercase tracking-wider" style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)' }}>
                        {results.length} Matches
                    </span>
                </h2>

                {results.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {results.map((res, idx) => (
                            <div key={idx} className="card p-5 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-1 rounded text-xs font-mono" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                                        {res.tag}
                                    </span>
                                    <button
                                        onClick={() => copyToClipboard(res.locator, idx)}
                                        className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                                        style={{
                                            background: copiedIdx === idx ? 'var(--copy-btn-hover-bg)' : 'var(--copy-btn-bg)',
                                            color: copiedIdx === idx ? 'var(--copy-btn-hover-text)' : 'var(--copy-btn-text)',
                                        }}
                                        onMouseEnter={(e) => { if (copiedIdx !== idx) { e.currentTarget.style.background = 'var(--copy-btn-hover-bg)'; e.currentTarget.style.color = 'var(--copy-btn-hover-text)'; } }}
                                        onMouseLeave={(e) => { if (copiedIdx !== idx) { e.currentTarget.style.background = 'var(--copy-btn-bg)'; e.currentTarget.style.color = 'var(--copy-btn-text)'; } }}
                                    >
                                        {copiedIdx === idx ? '✓ Copied!' : 'Copy'}
                                    </button>
                                </div>
                                {isMultiLine ? (
                                    <pre className="text-sm font-mono p-4 rounded-md overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto"
                                        style={{ background: 'var(--code-bg)', color: 'var(--muted-strong)' }}>
                                        {res.locator}
                                    </pre>
                                ) : (
                                    <code className="break-all text-sm font-mono" style={{ color: 'var(--muted-strong)' }}>
                                        {res.locator}
                                    </code>
                                )}
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>
        </DashboardLayout>
    );
}
