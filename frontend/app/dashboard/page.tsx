"use client";

import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ActivityAreaChart, LocatorTypePieChart } from '@/components/dashboard/AnalyticsCharts';
import {
    type HistoryEntry,
    type IndexedHistoryEntry,
    type DateFilter,
    type DatePreset,
    type AnalyticsPerf,
    defaultDateFilter,
    indexHistory,
    runAnalytics,
    activityChartTitle,
} from '@/lib/dashboard-analytics';

export default function DashboardOverview() {
    const { user, token, isGuest, isLoading } = useAuth();
    const router = useRouter();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [indexedHistory, setIndexedHistory] = useState<IndexedHistoryEntry[]>([]);
    const [fetching, setFetching] = useState(true);
    const [isExportOpen, setIsExportOpen] = useState(false);

    const initialFilter = defaultDateFilter();
    const [draftFilter, setDraftFilter] = useState<DateFilter>(initialFilter);
    const [appliedFilter, setAppliedFilter] = useState<DateFilter>(initialFilter);
    const dateFocusRef = useRef(0);

    useEffect(() => {
        if (!isLoading && !user && !isGuest) {
            router.push('/login');
        }
    }, [user, isGuest, isLoading, router]);

    useEffect(() => {
        if (!token) {
            if (isGuest) setFetching(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                const res = await fetch(`${apiUrl}/locator/history`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (res.ok && !cancelled) {
                    const data: HistoryEntry[] = await res.json();
                    setHistory(data);
                    setIndexedHistory(indexHistory(data));
                }
            } catch { /* ignore */ }
            if (!cancelled) setFetching(false);
        })();
        return () => { cancelled = true; };
    }, [token, isGuest]);

    const commitDraftFilter = useCallback(() => {
        setAppliedFilter(draftFilter);
    }, [draftFilter]);

    const filtersMatch =
        draftFilter.preset === appliedFilter.preset &&
        draftFilter.singleDay === appliedFilter.singleDay &&
        draftFilter.rangeStart === appliedFilter.rangeStart &&
        draftFilter.rangeEnd === appliedFilter.rangeEnd;

    const filterPending = !filtersMatch;

    const onDateFocus = () => {
        dateFocusRef.current += 1;
    };

    const onDateBlur = () => {
        dateFocusRef.current = Math.max(0, dateFocusRef.current - 1);
        if (dateFocusRef.current === 0) {
            commitDraftFilter();
        }
    };

    const setPreset = (preset: DatePreset) => {
        const next = { ...draftFilter, preset };
        setDraftFilter(next);
        setAppliedFilter(next);
        dateFocusRef.current = 0;
    };

    const patchDraft = (patch: Partial<DateFilter>) => {
        setDraftFilter((prev) => ({ ...prev, ...patch }));
    };

    const { filtered, charts, stats, perf } = useMemo(
        () => runAnalytics(indexedHistory, appliedFilter),
        [indexedHistory, appliedFilter],
    );

    const chartTitle = useMemo(() => activityChartTitle(appliedFilter), [appliedFilter]);

    const handleExport = (format: 'json' | 'csv') => {
        if (!filtered.length) return;
        const stamp = new Date().toISOString().split('T')[0];

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `locator-history-${stamp}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            const headers = ['Date', 'URL', 'Keyword', 'Locator Type', 'Results Count'];
            const rows = filtered.map((h) => [
                new Date(h.createdAt).toISOString(),
                h.url,
                h.keyword,
                h.locatorType,
                h.results.length.toString(),
            ]);
            const csvContent = [
                headers.join(','),
                ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `locator-history-${stamp}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Loading dashboard...</div>;
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 w-full">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Analytics Overview</h1>
                {!isGuest && filtered.length > 0 && (
                    <div
                        className="flex gap-2 relative"
                        tabIndex={-1}
                        onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                setIsExportOpen(false);
                            }
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setIsExportOpen(!isExportOpen)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 border btn-primary"
                        >
                            Export ▾
                        </button>
                        {isExportOpen && (
                            <ExportMenu
                                onCsv={() => { handleExport('csv'); setIsExportOpen(false); }}
                                onJson={() => { handleExport('json'); setIsExportOpen(false); }}
                            />
                        )}
                    </div>
                )}
            </div>

            {!isGuest && token && (
                <DateFilterPanel
                    draftFilter={draftFilter}
                    filterPending={filterPending}
                    historyCount={history.length}
                    perf={perf}
                    fetching={fetching}
                    filteredCount={filtered.length}
                    onPreset={setPreset}
                    onPatchDraft={patchDraft}
                    onDateFocus={onDateFocus}
                    onDateBlur={onDateBlur}
                    onApply={commitDraftFilter}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <KpiCard label="Total Searches" value={stats ? stats.totalSearches : 0} colorClass="text-amber-500" />
                    <KpiCard label="Elements Found" value={stats ? stats.totalElements : 0} colorClass="text-blue-500" />
                    <KpiCard
                        label="Top Locator Type"
                        value={stats ? stats.topType : 'None'}
                        colorClass="text-emerald-500"
                        capitalize
                    />
                </div>

                <div className="md:col-span-2 card p-6 shadow-sm min-h-[350px] flex flex-col relative">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{chartTitle}</h2>
                        {filterPending && <PendingBadge />}
                    </div>
                    {fetching ? (
                        <ChartState message="Loading chart data..." />
                    ) : history.length === 0 ? (
                        <ChartState
                            message="No activity data yet"
                            extra={
                                <Link href="/dashboard/locator" className="text-amber-500 font-medium text-sm mt-2 hover:underline">
                                    Start your first search
                                </Link>
                            }
                        />
                    ) : filtered.length === 0 ? (
                        <ChartState message="No searches in the selected period." subtitle="Change dates above, then click Apply filter." />
                    ) : (
                        <div className="flex-1 w-full min-h-[250px]" style={{ height: 280 }}>
                            <ActivityAreaChart data={charts.activityData} />
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="card p-6 shadow-sm min-h-[300px] flex flex-col">
                        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>Locator Types</h2>
                        {fetching ? (
                            <ChartState message="Loading..." />
                        ) : history.length === 0 ? (
                            <ChartState message="No data available" />
                        ) : filtered.length === 0 || charts.pieData.length === 0 ? (
                            <ChartState message="No locator types in this period." />
                        ) : (
                            <div className="w-full" style={{ height: 250 }}>
                                <LocatorTypePieChart data={charts.pieData} />
                            </div>
                        )}
                    </div>
                    <Link
                        href="/dashboard/locator"
                        className="inline-flex items-center justify-center gap-2 w-full btn-primary py-2 px-4 rounded-md text-sm font-semibold"
                    >
                        + New Search
                    </Link>
                </div>

                {!isGuest && (
                    <RecentTable fetching={fetching} historyEmpty={history.length === 0} filtered={filtered} />
                )}
            </div>
        </DashboardLayout>
    );
}

function PendingBadge() {
    return (
        <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0"
            style={{ color: 'var(--muted)', borderColor: 'var(--card-border)', background: 'var(--surface)' }}
        >
            Pending apply
        </span>
    );
}

function PerfMetrics({ perf, historyCount, filterPending }: { perf: AnalyticsPerf; historyCount: number; filterPending: boolean }) {
    return (
        <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t text-[11px] font-mono tabular-nums"
            style={{ borderColor: 'var(--card-border)', color: 'var(--muted)' }}
        >
            <span title="Searches matching the applied filter">{perf.recordCount} in report</span>
            <span title="Total saved searches">{historyCount} saved</span>
            <span title="Points drawn on the activity chart">{perf.activityPoints} chart pts</span>
            <span title="Time to filter history">{perf.filterMs}ms filter</span>
            <span title="Time to build chart series">{perf.chartMs}ms charts</span>
            <span title="Combined analytics compute">{perf.totalMs}ms total</span>
            {filterPending && <span className="text-amber-600 dark:text-amber-400">· draft not applied</span>}
        </div>
    );
}

function DateFilterPanel({
    draftFilter,
    filterPending,
    historyCount,
    perf,
    fetching,
    filteredCount,
    onPreset,
    onPatchDraft,
    onDateFocus,
    onDateBlur,
    onApply,
}: {
    draftFilter: DateFilter;
    filterPending: boolean;
    historyCount: number;
    perf: AnalyticsPerf;
    fetching: boolean;
    filteredCount: number;
    onPreset: (p: DatePreset) => void;
    onPatchDraft: (p: Partial<DateFilter>) => void;
    onDateFocus: () => void;
    onDateBlur: () => void;
    onApply: () => void;
}) {
    const inputStyle = {
        background: 'var(--input-bg)',
        borderColor: 'var(--input-border)',
        color: 'var(--foreground)',
    };

    return (
        <div className="card p-4 md:p-5 mb-6 shadow-sm border" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Report period</p>
                    <div className="inline-flex rounded-lg p-0.5 border" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)' }}>
                        {(['all', 'single', 'range'] as const).map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => onPreset(preset)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                                    draftFilter.preset === preset ? 'bg-amber-500 text-black shadow-sm' : 'hover:opacity-90'
                                }`}
                                style={draftFilter.preset === preset ? {} : { color: 'var(--muted)' }}
                            >
                                {preset === 'all' ? 'All time' : preset === 'single' ? 'One day' : 'Date range'}
                            </button>
                        ))}
                    </div>
                </div>

                {draftFilter.preset === 'single' && (
                    <label className="flex flex-col gap-1.5 min-w-[10rem]">
                        <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Day</span>
                        <input
                            type="date"
                            value={draftFilter.singleDay}
                            onChange={(e) => onPatchDraft({ singleDay: e.target.value })}
                            onFocus={onDateFocus}
                            onBlur={onDateBlur}
                            className="rounded-md px-3 py-2 text-sm border w-full max-w-xs"
                            style={inputStyle}
                        />
                    </label>
                )}

                {draftFilter.preset === 'range' && (
                    <div className="flex flex-wrap items-end gap-4">
                        <label className="flex flex-col gap-1.5 min-w-[10rem]">
                            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>From</span>
                            <input
                                type="date"
                                value={draftFilter.rangeStart}
                                onChange={(e) => onPatchDraft({ rangeStart: e.target.value })}
                                onFocus={onDateFocus}
                                onBlur={onDateBlur}
                                className="rounded-md px-3 py-2 text-sm border w-full"
                                style={inputStyle}
                            />
                        </label>
                        <label className="flex flex-col gap-1.5 min-w-[10rem]">
                            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>To</span>
                            <input
                                type="date"
                                value={draftFilter.rangeEnd}
                                onChange={(e) => onPatchDraft({ rangeEnd: e.target.value })}
                                onFocus={onDateFocus}
                                onBlur={onDateBlur}
                                className="rounded-md px-3 py-2 text-sm border w-full"
                                style={inputStyle}
                            />
                        </label>
                    </div>
                )}

                {draftFilter.preset !== 'all' && filterPending && (
                    <button
                        type="button"
                        onClick={onApply}
                        className="text-xs font-semibold px-4 py-2 rounded-md btn-primary shrink-0"
                    >
                        Apply filter
                    </button>
                )}
            </div>

            <p className="text-[11px] mt-2" style={{ color: 'var(--muted)' }}>
                Charts update when you close the calendar or click Apply — not while scrolling the year (smoother &amp; faster).
            </p>

            {!fetching && historyCount > 0 && draftFilter.preset !== 'all' && filteredCount === 0 && !filterPending && (
                <p className="text-xs font-medium mt-2 text-amber-600 dark:text-amber-400">
                    No searches in this period. Adjust the date or switch to All time.
                </p>
            )}

            {historyCount > 0 && <PerfMetrics perf={perf} historyCount={historyCount} filterPending={filterPending} />}
        </div>
    );
}

function KpiCard({ label, value, colorClass, capitalize }: { label: string; value: string | number; colorClass: string; capitalize?: boolean }) {
    return (
        <div className="card p-6 flex flex-col justify-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
            <p className={`text-3xl font-bold ${colorClass}`} style={capitalize ? { textTransform: 'capitalize' } : undefined}>
                {value}
            </p>
        </div>
    );
}

function ChartState({ message, subtitle, extra }: { message: string; subtitle?: string; extra?: ReactNode }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 opacity-80">
            <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>{message}</p>
            {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
            {extra}
        </div>
    );
}

function RecentTable({
    fetching,
    historyEmpty,
    filtered,
}: {
    fetching: boolean;
    historyEmpty: boolean;
    filtered: IndexedHistoryEntry[];
}) {
    return (
        <div className="md:col-span-3 card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Recent Activity</h2>
                {filtered.length > 5 && (
                    <Link href="/history" className="text-sm text-amber-500 hover:text-amber-400 font-medium">View All →</Link>
                )}
            </div>
            {fetching ? (
                <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading recent activity...</p>
            ) : historyEmpty ? (
                <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No recent searches found.</p>
            ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No searches in the selected period.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--card-border)', color: 'var(--muted)' }}>
                                <th className="pb-3 text-xs uppercase font-semibold">Keyword</th>
                                <th className="pb-3 text-xs uppercase font-semibold hidden sm:table-cell">URL</th>
                                <th className="pb-3 text-xs uppercase font-semibold">Type</th>
                                <th className="pb-3 text-xs uppercase font-semibold text-center hidden sm:table-cell">Results</th>
                                <th className="pb-3 text-xs uppercase font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filtered.slice(0, 5).map((entry) => (
                                <tr key={entry._id} className="border-b last:border-0" style={{ borderColor: 'var(--card-border)' }}>
                                    <td className="py-4 pr-4">
                                        <span className="font-medium px-2 py-1 rounded bg-black/5 dark:bg-white/10">{entry.keyword}</span>
                                    </td>
                                    <td className="py-4 pr-4 max-w-[200px] truncate hidden sm:table-cell" style={{ color: 'var(--muted)' }}>
                                        {new URL(entry.url).hostname}
                                    </td>
                                    <td className="py-4 pr-4">
                                        <span className="text-xs font-semibold px-2 py-1 rounded-full border" style={{ borderColor: 'var(--card-border)', color: 'var(--muted)' }}>
                                            {entry.locatorType}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-4 text-center hidden sm:table-cell tabular-nums" style={{ color: 'var(--muted)' }}>
                                        {entry.results.length}
                                    </td>
                                    <td className="py-3 text-right">
                                        <Link
                                            href={`/dashboard/locator?url=${encodeURIComponent(entry.url)}&keyword=${encodeURIComponent(entry.keyword)}&type=${encodeURIComponent(entry.locatorType)}`}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
                                            style={{ color: 'var(--foreground)', borderColor: 'var(--card-border)' }}
                                        >
                                            Re-run
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function ExportMenu({ onCsv, onJson }: { onCsv: () => void; onJson: () => void }) {
    return (
        <div
            className="absolute right-0 top-full mt-2 w-32 rounded-lg shadow-lg border z-10"
            style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}
        >
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onCsv}
                className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 first:rounded-t-lg"
                style={{ color: 'var(--foreground)' }}
            >
                Export CSV
            </button>
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={onJson}
                className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 last:rounded-b-lg"
                style={{ color: 'var(--foreground)' }}
            >
                Export JSON
            </button>
        </div>
    );
}
