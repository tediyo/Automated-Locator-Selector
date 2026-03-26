"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LocatorResult {
    tag: string;
    locator: string;
    snippets?: {
        playwright?: string;
        cypress?: string;
        selenium?: string;
    };
}

interface HistoryEntry {
    _id: string;
    url: string;
    keyword: string;
    locatorType: string;
    results: LocatorResult[];
    createdAt: string;
}

export default function HistoryPage() {
    const { user, token, isGuest, logout, isLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
    const [historyCopiedIdx, setHistoryCopiedIdx] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && !user && !isGuest) {
            router.push('/login');
        }
    }, [user, isGuest, isLoading, router]);

    const fetchHistory = async () => {
        if (!token) return;
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/locator/history`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch { }
    };

    useEffect(() => {
        if (token) fetchHistory();
    }, [token]);

    if (isLoading || (!user && !isGuest)) return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Loading...</div>;

    if (isGuest) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="card w-full max-w-lg p-8 space-y-6 text-center">
                    <h1 className="text-3xl font-bold text-amber-500 mb-2">Search History</h1>
                    <p style={{ color: 'var(--muted)' }}>Guest users do not have access to search history.</p>
                    <Link href="/signup" className="block w-full btn-primary py-2.5 rounded-lg mt-4">Sign Up to Start Saving</Link>
                    <div className="mt-4">
                        <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">← Back to Dashboard</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-3 bg-transparent mt-2 mb-6">
                {/* Left: Back + Title */}
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/dashboard" className="text-sm px-3 py-1.5 rounded-md transition-all font-medium hover:-translate-x-1 hover:bg-[var(--surface-hover)] shadow-sm shrink-0" style={{ color: 'var(--foreground)', background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                        Back
                    </Link>
                    <h1 className="text-lg font-bold tracking-tight truncate text-[var(--foreground)]">Search History</h1>
                </div>
                {/* Right: badge + controls */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full font-medium shadow-sm whitespace-nowrap">
                        {history.length} {history.length === 1 ? 'Search' : 'Searches'}
                    </span>
                    <div className="w-px h-4 bg-[var(--card-border)]"></div>
                    <button onClick={toggleTheme} className="theme-toggle scale-90 opacity-80 hover:opacity-100 transition-opacity" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                        {theme === 'dark' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                        )}
                    </button>
                    <button onClick={logout} className="text-xs hover:text-red-400 transition-colors hidden sm:block" style={{ color: 'var(--muted)' }}>Sign Out</button>
                </div>
            </header>

            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                    <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Review past locator extractions and access saved snippets.</p>
                    {history.length > 0 && (
                        <button
                            onClick={async () => {
                                if (!confirm('Clear all search history?')) return;
                                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                                await fetch(`${apiUrl}/locator/history`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` },
                                });
                                setHistory([]);
                            }}
                            className="text-sm px-4 py-2 rounded-lg transition-all font-medium shadow-sm"
                            style={{ color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--card-border)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'var(--surface)'; }}
                        >
                            Clear All History
                        </button>
                    )}
                </div>

                {history.length > 0 ? (
                    <div className="space-y-3">
                        {history.map((entry) => (
                            <div key={entry._id} className="card p-4 transition-all hover:border-[var(--accent)] hover:shadow-md border border-[var(--card-border)] bg-[var(--surface)] relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-transparent group-hover:bg-amber-500 transition-colors"></div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Main info section */}
                                    <button
                                        onClick={() => setExpandedHistory(expandedHistory === entry._id ? null : entry._id)}
                                        className="flex-1 text-left bg-transparent border-none cursor-pointer p-0 focus:outline-none flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 overflow-hidden w-full"
                                    >
                                        {/* Keyword & Type */}
                                        <div className="flex items-center gap-2 shrink-0 max-w-full">
                                            <span className="text-sm font-semibold truncate" title={entry.keyword} style={{ color: 'var(--foreground)' }}>
                                                {entry.keyword}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                                                {entry.locatorType}
                                            </span>
                                        </div>
                                        
                                        {/* URL */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-xs opacity-60 shrink-0" style={{ color: 'var(--muted)' }}>on</span>
                                            <span className="text-xs font-mono truncate" title={entry.url} style={{ color: 'var(--muted-strong)' }}>
                                                {entry.url.replace(/^https?:\/\//, '')}
                                            </span>
                                        </div>

                                        {/* Stats & Date */}
                                        <div className="flex items-center gap-2 shrink-0 text-[11px] mt-1 sm:mt-0" style={{ color: 'var(--muted)' }}>
                                            <span>
                                                {entry.results.length} result{entry.results.length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="opacity-50">•</span>
                                            <span>
                                                {new Date(entry.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                            <span className={`transition-transform ml-1 border rounded-full w-4 h-4 flex items-center justify-center border-transparent ${expandedHistory === entry._id ? 'rotate-180 bg-[var(--surface-hover)]' : ''}`}>
                                                ▼
                                            </span>
                                        </div>
                                     </button>
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                                        <button
                                            onClick={() => { 
                                                const rerunParams = new URLSearchParams({ url: entry.url, keyword: entry.keyword, type: entry.locatorType });
                                                router.push(`/dashboard/locator?${rerunParams.toString()}`);
                                            }}
                                            className="text-[11px] px-2.5 py-1.5 rounded transition-all font-medium flex items-center gap-1 shadow-sm border"
                                            style={{ color: 'var(--foreground)', background: 'var(--surface)', borderColor: 'var(--card-border)' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--surface-hover)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.background = 'var(--surface)'; }}
                                            title="Re-run this search in Dashboard"
                                        >
                                            <span className="text-sm leading-none">↻</span>
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                                                await fetch(`${apiUrl}/locator/history/${entry._id}`, {
                                                    method: 'DELETE',
                                                    headers: { 'Authorization': `Bearer ${token}` },
                                                });
                                                setHistory(h => h.filter(e => e._id !== entry._id));
                                            }}
                                            className="text-[11px] px-2.5 py-1.5 rounded transition-all font-medium flex items-center gap-1 shadow-sm border hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                                            style={{ color: 'var(--muted)', background: 'var(--surface)', borderColor: 'var(--card-border)' }}
                                            title="Delete this entry"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </div>
                                </div>

                                {expandedHistory === entry._id && entry.results.length > 0 && (
                                    <div className="mt-5 space-y-3 pt-5 border-t border-[var(--card-border)]">
                                        {entry.results.map((res, idx) => {
                                            const copyKey = `${entry._id}-${idx}`;
                                            return (
                                                <div key={idx} className="flex flex-col gap-2 p-4 rounded-lg border border-transparent hover:border-amber-500/20 transition-colors" style={{ background: 'var(--code-bg)' }}>
                                                    {/* Top row: tag + raw locator */}
                                                    <div className="flex items-start gap-4">
                                                        <span className="text-xs px-2 py-1 rounded font-mono shrink-0" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>{res.tag}</span>
                                                        <code className="text-sm font-mono break-all flex-1 leading-relaxed" style={{ color: 'var(--muted-strong)' }}>{res.locator}</code>
                                                        <button
                                                            onClick={() => { navigator.clipboard.writeText(res.locator); setHistoryCopiedIdx(copyKey); setTimeout(() => setHistoryCopiedIdx(null), 2000); }}
                                                            className="text-xs px-3 py-1.5 rounded-md transition-all font-medium border border-[var(--card-border)]"
                                                            style={{
                                                                background: historyCopiedIdx === copyKey ? 'var(--copy-btn-hover-bg)' : 'var(--copy-btn-bg)',
                                                                color: historyCopiedIdx === copyKey ? 'var(--copy-btn-hover-text)' : 'var(--copy-btn-text)'
                                                            }}
                                                        >
                                                            {historyCopiedIdx === copyKey ? '✓ Copied' : 'Copy'}
                                                        </button>
                                                    </div>

                                                    {/* Snippets from DB */}
                                                    {res.snippets && (
                                                        <div className="mt-2 pt-2 border-t border-[var(--card-border)] flex flex-col gap-2 overflow-x-auto pb-1">
                                                            {['playwright', 'cypress', 'selenium'].map((fw) => {
                                                                const code = res.snippets![fw as keyof typeof res.snippets];
                                                                if (!code) return null;
                                                                const snipCopyKey = `${copyKey}-${fw}`;
                                                                return (
                                                                    <div key={fw} className="flex-1 min-w-[250px] bg-[var(--surface)] border border-[var(--card-border)] rounded-md p-2">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{fw}</span>
                                                                            <button
                                                                                onClick={() => { navigator.clipboard.writeText(code); setHistoryCopiedIdx(snipCopyKey); setTimeout(() => setHistoryCopiedIdx(null), 2000); }}
                                                                                className="text-[10px] px-2 py-0.5 rounded transition-all font-medium"
                                                                                style={{
                                                                                    background: historyCopiedIdx === snipCopyKey ? 'var(--copy-btn-hover-bg)' : 'var(--copy-btn-bg)',
                                                                                    color: historyCopiedIdx === snipCopyKey ? '#000' : 'var(--copy-btn-text)'
                                                                                }}
                                                                            >
                                                                                {historyCopiedIdx === snipCopyKey ? '✓' : 'Copy'}
                                                                            </button>
                                                                        </div>
                                                                        <pre className="text-[10px] font-mono whitespace-pre break-all leading-relaxed text-[var(--muted-strong)] overflow-x-auto">
                                                                            {code}
                                                                        </pre>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 px-4 card shadow-sm mt-4 border-dashed border-[var(--card-border)] bg-[var(--surface)] max-w-2xl mx-auto rounded-xl">
                        <div className="mx-auto w-12 h-12 rounded-full border border-dashed border-[var(--muted)] flex items-center justify-center mb-4 text-[var(--muted)] opacity-50">
                            
                        </div>
                        <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>No history yet</h3>
                        <p className="text-xs mt-1.5 font-medium max-w-sm mx-auto" style={{ color: 'var(--muted)' }}>Generate some locators on the dashboard and they will be safely stored here for future reference.</p>
                        <Link href="/dashboard" className="inline-block mt-5 btn-primary text-xs px-5 py-2 rounded-md shadow-sm opacity-90 hover:opacity-100 transition-opacity">Go to Dashboard</Link>
                    </div>
                )}
            </section>
        </div>
    );
}
