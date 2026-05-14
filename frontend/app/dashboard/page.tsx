"use client";

import { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

interface LocatorResult {
    tag: string;
    locator: string;
}

interface HistoryEntry {
    _id: string;
    url: string;
    keyword: string;
    locatorType: string;
    results: LocatorResult[];
    createdAt: string;
}

type DatePreset = 'all' | 'single' | 'range';

function toYMD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Local calendar day start (00:00:00.000) */
function startOfLocalDay(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Local calendar day end (23:59:59.999) */
function endOfLocalDay(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
}

function eachLocalDayInclusive(fromYmd: string, toYmd: string): string[] {
    const start = startOfLocalDay(fromYmd);
    const end = endOfLocalDay(toYmd);
    if (start.getTime() > end.getTime()) return eachLocalDayInclusive(toYmd, fromYmd);
    const days: string[] = [];
    const cur = new Date(start);
    while (cur.getTime() <= end.getTime()) {
        days.push(toYMD(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

/** Inclusive day count between two local calendar days (1 = same day). */
function inclusiveLocalDayCount(fromYmd: string, toYmd: string): number {
    const [lo, hi] = fromYmd <= toYmd ? [fromYmd, toYmd] : [toYmd, fromYmd];
    const s = startOfLocalDay(lo);
    const e = endOfLocalDay(hi);
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
}

/** YYYY-MM keys for every calendar month touched by [fromYmd, toYmd] (inclusive). */
function eachMonthKeyInclusive(fromYmd: string, toYmd: string): string[] {
    const [lo, hi] = fromYmd <= toYmd ? [fromYmd, toYmd] : [toYmd, fromYmd];
    const start = startOfLocalDay(lo);
    const end = endOfLocalDay(hi);
    const keys: string[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur.getTime() <= end.getTime()) {
        keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
        cur.setMonth(cur.getMonth() + 1);
    }
    return keys;
}

export default function DashboardOverview() {
    const { user, token, isGuest, isLoading } = useAuth();
    const router = useRouter();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [fetching, setFetching] = useState(true);
    const [isExportOpen, setIsExportOpen] = useState(false);

    const [datePreset, setDatePreset] = useState<DatePreset>('all');
    const [singleDay, setSingleDay] = useState(() => toYMD(new Date()));
    const [rangeStart, setRangeStart] = useState(() => {
        const t = new Date();
        t.setDate(t.getDate() - 6);
        return toYMD(t);
    });
    const [rangeEnd, setRangeEnd] = useState(() => toYMD(new Date()));

    const deferredSingleDay = useDeferredValue(singleDay);
    const deferredRangeStart = useDeferredValue(rangeStart);
    const deferredRangeEnd = useDeferredValue(rangeEnd);

    useEffect(() => {
        if (!isLoading && !user && !isGuest) {
            router.push('/login');
        }
    }, [user, isGuest, isLoading, router]);

    const fetchHistory = async () => {
        if (!token) {
            setFetching(false);
            return;
        }
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
        setFetching(false);
    };

    useEffect(() => {
        if (token) {
            fetchHistory();
        } else if (isGuest) {
            setFetching(false);
        }
    }, [token, isGuest]);

    const filteredHistory = useMemo(() => {
        if (datePreset === 'all') return history;

        if (datePreset === 'single') {
            const start = startOfLocalDay(deferredSingleDay);
            const end = endOfLocalDay(deferredSingleDay);
            return history.filter((e) => {
                const t = new Date(e.createdAt).getTime();
                return t >= start.getTime() && t <= end.getTime();
            });
        }

        const rs = startOfLocalDay(deferredRangeStart);
        const re = endOfLocalDay(deferredRangeEnd);
        const lo = Math.min(rs.getTime(), re.getTime());
        const hi = Math.max(rs.getTime(), re.getTime());
        return history.filter((e) => {
            const t = new Date(e.createdAt).getTime();
            return t >= lo && t <= hi;
        });
    }, [history, datePreset, deferredSingleDay, deferredRangeStart, deferredRangeEnd]);

    const activityChartTitle = useMemo(() => {
        if (datePreset === 'all') return 'Search Activity (Last 7 Days)';
        if (datePreset === 'single') {
            const d = startOfLocalDay(deferredSingleDay);
            return `Search Activity (${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })})`;
        }
        const a = startOfLocalDay(deferredRangeStart <= deferredRangeEnd ? deferredRangeStart : deferredRangeEnd);
        const b = endOfLocalDay(deferredRangeStart <= deferredRangeEnd ? deferredRangeEnd : deferredRangeStart);
        const span = inclusiveLocalDayCount(deferredRangeStart, deferredRangeEnd);
        const byMonth = span > 366;
        return `Search Activity (${a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${b.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}${byMonth ? ', by month' : ''})`;
    }, [datePreset, deferredSingleDay, deferredRangeStart, deferredRangeEnd]);

    // Derived Statistics (respects date filter)
    const stats = useMemo(() => {
        if (!filteredHistory.length) return null;

        const totalSearches = filteredHistory.length;
        const totalElements = filteredHistory.reduce((sum, entry) => sum + entry.results.length, 0);

        const typeCounts: Record<string, number> = {};
        filteredHistory.forEach((h) => {
            typeCounts[h.locatorType] = (typeCounts[h.locatorType] || 0) + 1;
        });

        let topType = 'N/A';
        let maxCount = 0;
        Object.entries(typeCounts).forEach(([type, count]) => {
            if (count > maxCount) {
                maxCount = count;
                topType = type;
            }
        });

        return { totalSearches, totalElements, topType };
    }, [filteredHistory]);

    // Chart Data Preparation
    const chartData = useMemo(() => {
        const typeCounts: Record<string, number> = {};
        filteredHistory.forEach((entry) => {
            typeCounts[entry.locatorType] = (typeCounts[entry.locatorType] || 0) + 1;
        });

        let activityData: { date: string; searches: number }[];

        if (datePreset === 'all') {
            const dateMap: Record<string, number> = {};
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                dateMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
            }
            filteredHistory.forEach((entry) => {
                const dateStr = new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (dateMap[dateStr] !== undefined) {
                    dateMap[dateStr]++;
                }
            });
            activityData = Object.keys(dateMap).map((date) => ({ date, searches: dateMap[date] }));
        } else if (datePreset === 'single') {
            const label = startOfLocalDay(deferredSingleDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            activityData = [{ date: label, searches: filteredHistory.length }];
        } else {
            const from = deferredRangeStart <= deferredRangeEnd ? deferredRangeStart : deferredRangeEnd;
            const to = deferredRangeStart <= deferredRangeEnd ? deferredRangeEnd : deferredRangeStart;
            const spanDays = inclusiveLocalDayCount(from, to);

            if (spanDays > 366) {
                const monthKeys = eachMonthKeyInclusive(from, to);
                const monthMap: Record<string, number> = {};
                monthKeys.forEach((k) => {
                    monthMap[k] = 0;
                });
                filteredHistory.forEach((entry) => {
                    const d = new Date(entry.createdAt);
                    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    if (monthMap[k] !== undefined) {
                        monthMap[k]++;
                    }
                });
                activityData = monthKeys.map((k) => {
                    const [y, m] = k.split('-').map(Number);
                    const d = new Date(y, m - 1, 1);
                    const date = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    return { date, searches: monthMap[k] };
                });
            } else {
                const dayKeys = eachLocalDayInclusive(from, to);
                const startY = parseInt(from.slice(0, 4), 10);
                const endY = parseInt(to.slice(0, 4), 10);
                const multiYear = startY !== endY;
                const dateMap: Record<string, number> = {};
                dayKeys.forEach((ymd) => {
                    dateMap[ymd] = 0;
                });
                filteredHistory.forEach((entry) => {
                    const ymd = toYMD(new Date(entry.createdAt));
                    if (dateMap[ymd] !== undefined) {
                        dateMap[ymd]++;
                    }
                });
                activityData = dayKeys.map((ymd) => {
                    const d = startOfLocalDay(ymd);
                    const date = multiYear
                        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return { date, searches: dateMap[ymd] };
                });
            }
        }

        const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
        const pieData = Object.keys(typeCounts).map((key, index) => ({
            name: key,
            value: typeCounts[key],
            color: COLORS[index % COLORS.length],
        }));

        return { activityData, pieData };
    }, [filteredHistory, datePreset, deferredSingleDay, deferredRangeStart, deferredRangeEnd]);

    const handleExport = (format: 'json' | 'csv') => {
        if (!filteredHistory.length) return;

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(filteredHistory, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `locator-history-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        } else {
            const headers = ['Date', 'URL', 'Keyword', 'Locator Type', 'Results Count'];
            const rows = filteredHistory.map((h) => [
                new Date(h.createdAt).toISOString(),
                h.url,
                h.keyword,
                h.locatorType,
                h.results.length.toString()
            ]);
            const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `locator-history-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        }
    };

    if (isLoading) return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Loading dashboard...</div>;

    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 w-full">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Analytics Overview</h1>
                {!isGuest && filteredHistory.length > 0 && (
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
                            onClick={() => setIsExportOpen(!isExportOpen)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 border btn-primary"
                        >
                            Export ▾
                        </button>
                        {isExportOpen && (
                            <div className="absolute right-0 top-full mt-2 w-32 rounded-lg shadow-lg border transition-all z-10" style={{ background: 'var(--surface)', borderColor: 'var(--card-border)' }}>
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { handleExport('csv'); setIsExportOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors first:rounded-t-lg" style={{ color: 'var(--foreground)' }}>Export CSV</button>
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => { handleExport('json'); setIsExportOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors last:rounded-b-lg" style={{ color: 'var(--foreground)' }}>Export JSON</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {!isGuest && token && (
                <div className="card p-4 md:p-5 mb-6 shadow-sm border" style={{ borderColor: 'var(--card-border)' }}>
                    <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Report period</p>
                            <div className="inline-flex rounded-lg p-0.5 border" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)' }}>
                                {(['all', 'single', 'range'] as const).map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setDatePreset(preset)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                            datePreset === preset
                                                ? 'bg-amber-500 text-black shadow-sm'
                                                : 'hover:opacity-90'
                                        }`}
                                        style={datePreset === preset ? {} : { color: 'var(--muted)' }}
                                    >
                                        {preset === 'all' ? 'All time' : preset === 'single' ? 'One day' : 'Date range'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {datePreset === 'single' && (
                            <label className="flex flex-col gap-1.5 min-w-[10rem]">
                                <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Day</span>
                                <input
                                    type="date"
                                    value={singleDay}
                                    onChange={(e) => setSingleDay(e.target.value)}
                                    className="rounded-md px-3 py-2 text-sm border w-full max-w-xs"
                                    style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--foreground)' }}
                                />
                            </label>
                        )}
                        {datePreset === 'range' && (
                            <div className="flex flex-wrap items-end gap-4">
                                <label className="flex flex-col gap-1.5 min-w-[10rem]">
                                    <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>From</span>
                                    <input
                                        type="date"
                                        value={rangeStart}
                                        onChange={(e) => setRangeStart(e.target.value)}
                                        className="rounded-md px-3 py-2 text-sm border w-full"
                                        style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--foreground)' }}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 min-w-[10rem]">
                                    <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>To</span>
                                    <input
                                        type="date"
                                        value={rangeEnd}
                                        onChange={(e) => setRangeEnd(e.target.value)}
                                        className="rounded-md px-3 py-2 text-sm border w-full"
                                        style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--foreground)' }}
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                    {!fetching && history.length > 0 && datePreset !== 'all' && filteredHistory.length === 0 && (
                        <p className="text-xs font-medium mt-3 text-amber-600 dark:text-amber-400">
                            No searches in this period. Adjust the date or switch to &quot;All time&quot; to see your full history.
                        </p>
                    )}
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* KPI Cards */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="card p-6 flex flex-col justify-center shadow-sm">
                        <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Total Searches</p>
                        <p className="text-3xl font-bold text-amber-500">{stats ? stats.totalSearches : 0}</p>
                    </div>
                    <div className="card p-6 flex flex-col justify-center shadow-sm">
                        <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Elements Found</p>
                        <p className="text-3xl font-bold text-blue-500">{stats ? stats.totalElements : 0}</p>
                    </div>
                    <div className="card p-6 flex flex-col justify-center shadow-sm">
                        <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Top Locator Type</p>
                        <p className="text-3xl font-bold text-emerald-500" style={{ textTransform: 'capitalize' }}>
                            {stats ? stats.topType : 'None'}
                        </p>
                    </div>
                </div>

                {/* Main Activity Chart */}
                <div className="md:col-span-2 card p-6 shadow-sm min-h-[350px] flex flex-col">
                    <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--foreground)' }}>{activityChartTitle}</h2>
                    {fetching ? (
                        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>Loading chart data...</div>
                    ) : history.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
                            <span className="text-4xl mb-3 block">📊</span>
                            <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>No activity data yet</p>
                            <Link href="/dashboard/locator" className="text-amber-500 font-medium text-sm mt-2 hover:underline">Start your first search</Link>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80">
                            <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>No searches in the selected period.</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Change the report period above or pick different dates.</p>
                        </div>
                    ) : (
                        <div className="flex-1 w-full h-full min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData.activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                                    <XAxis dataKey="date" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }}
                                        itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="searches" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorSearches)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Pie Chart & Quick Actions */}
                <div className="space-y-6">
                    
                    <div className="card p-6 shadow-sm min-h-[300px] flex flex-col">
                        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>Locator Types</h2>
                        {fetching ? (
                            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>Loading...</div>
                        ) : history.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>No data available</div>
                        ) : filteredHistory.length === 0 || chartData.pieData.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-sm text-center px-2" style={{ color: 'var(--muted)' }}>No locator types in this period.</div>
                        ) : (
                            <div className="w-full" style={{ height: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            nameKey="name"
                                            stroke="none"
                                            isAnimationActive={true}
                                        >
                                            {chartData.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--card-border)', color: 'var(--foreground)', borderRadius: '8px' }}
                                            itemStyle={{ fontWeight: 'bold' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'var(--foreground)' }}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    <Link href="/dashboard/locator" className="inline-flex items-center justify-center gap-2 w-full btn-primary py-2 px-4 rounded-md text-sm font-semibold transition-all hover:shadow-amber-500/20">
                        + New Search
                    </Link>

                </div>

                {/* Recent Searches Table */}
                {!isGuest && (
                    <div className="md:col-span-3 card p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Recent Activity</h2>
                            {filteredHistory.length > 5 && (
                                <Link href="/history" className="text-sm text-amber-500 hover:text-amber-400 font-medium">View All →</Link>
                            )}
                        </div>
                        
                        {fetching ? (
                            <div className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading recent activity...</div>
                        ) : history.length === 0 ? (
                            <div className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No recent searches found.</div>
                        ) : filteredHistory.length === 0 ? (
                            <div className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No searches in the selected period.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b" style={{ borderColor: 'var(--card-border)', color: 'var(--muted)' }}>
                                            <th className="pb-3 text-xs uppercase font-semibold whitespace-nowrap">Keyword</th>
                                            <th className="pb-3 text-xs uppercase font-semibold whitespace-nowrap hidden sm:table-cell">URL</th>
                                            <th className="pb-3 text-xs uppercase font-semibold whitespace-nowrap">Type</th>
                                            <th className="pb-3 text-xs uppercase font-semibold whitespace-nowrap text-center hidden sm:table-cell">Results</th>
                                            <th className="pb-3 text-xs uppercase font-semibold whitespace-nowrap text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {filteredHistory.slice(0, 5).map((entry) => (
                                            <tr key={entry._id} className="border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--card-border)' }}>
                                                <td className="py-4 pr-4">
                                                    <span className="font-medium px-2 py-1 rounded bg-black/5 dark:bg-white/10" style={{ color: 'var(--foreground)' }}>
                                                        {entry.keyword}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4 max-w-[200px] truncate hidden sm:table-cell" style={{ color: 'var(--muted)' }}>
                                                    {new URL(entry.url).hostname}
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <span className="text-xs font-semibold px-2 py-1 rounded-full border shrink-0" style={{ borderColor: 'var(--card-border)', color: 'var(--muted)' }}>
                                                        {entry.locatorType}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4 text-center hidden sm:table-cell tabular-nums" style={{ color: 'var(--muted)' }}>
                                                    {entry.results.length}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <Link 
                                                        href={`/dashboard/locator?url=${encodeURIComponent(entry.url)}&keyword=${encodeURIComponent(entry.keyword)}&type=${encodeURIComponent(entry.locatorType)}`}
                                                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
                )}
                
            </div>
        </DashboardLayout>
    );
}
