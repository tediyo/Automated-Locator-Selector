export interface LocatorResult {
    tag: string;
    locator: string;
}

export interface HistoryEntry {
    _id: string;
    url: string;
    keyword: string;
    locatorType: string;
    results: LocatorResult[];
    createdAt: string;
}

/** History row with pre-parsed timestamp for fast filtering */
export interface IndexedHistoryEntry extends HistoryEntry {
    at: number;
}

export type DatePreset = 'all' | 'single' | 'range';

export interface DateFilter {
    preset: DatePreset;
    singleDay: string;
    rangeStart: string;
    rangeEnd: string;
}

export interface ActivityPoint {
    date: string;
    searches: number;
}

export interface PiePoint {
    name: string;
    value: number;
    color: string;
}

export interface ChartBundle {
    activityData: ActivityPoint[];
    pieData: PiePoint[];
    activityPointCount: number;
}

export interface AnalyticsPerf {
    filterMs: number;
    chartMs: number;
    totalMs: number;
    recordCount: number;
    activityPoints: number;
}

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export function indexHistory(entries: HistoryEntry[]): IndexedHistoryEntry[] {
    return entries.map((e) => ({ ...e, at: new Date(e.createdAt).getTime() }));
}

export function toYMD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function defaultDateFilter(): DateFilter {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    return {
        preset: 'all',
        singleDay: toYMD(today),
        rangeStart: toYMD(weekAgo),
        rangeEnd: toYMD(today),
    };
}

function startOfLocalDay(ymd: string): number {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function endOfLocalDay(ymd: string): number {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function inclusiveLocalDayCount(fromYmd: string, toYmd: string): number {
    const [lo, hi] = fromYmd <= toYmd ? [fromYmd, toYmd] : [toYmd, fromYmd];
    return Math.floor((endOfLocalDay(hi) - startOfLocalDay(lo)) / 86400000) + 1;
}

function eachLocalDayInclusive(fromYmd: string, toYmd: string): string[] {
    const [lo, hi] = fromYmd <= toYmd ? [fromYmd, toYmd] : [toYmd, fromYmd];
    const days: string[] = [];
    const cur = new Date(startOfLocalDay(lo));
    const end = endOfLocalDay(hi);
    while (cur.getTime() <= end) {
        days.push(toYMD(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

function eachMonthKeyInclusive(fromYmd: string, toYmd: string): string[] {
    const [lo, hi] = fromYmd <= toYmd ? [fromYmd, toYmd] : [toYmd, fromYmd];
    const keys: string[] = [];
    const cur = new Date(startOfLocalDay(lo));
    cur.setDate(1);
    const end = endOfLocalDay(hi);
    while (cur.getTime() <= end) {
        keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
        cur.setMonth(cur.getMonth() + 1);
    }
    return keys;
}

export function filterHistory(entries: IndexedHistoryEntry[], filter: DateFilter): IndexedHistoryEntry[] {
    if (filter.preset === 'all') return entries;

    if (filter.preset === 'single') {
        const lo = startOfLocalDay(filter.singleDay);
        const hi = endOfLocalDay(filter.singleDay);
        return entries.filter((e) => e.at >= lo && e.at <= hi);
    }

    const rs = startOfLocalDay(filter.rangeStart);
    const re = endOfLocalDay(filter.rangeEnd);
    const lo = Math.min(rs, re);
    const hi = Math.max(rs, re);
    return entries.filter((e) => e.at >= lo && e.at <= hi);
}

export function computeStats(entries: IndexedHistoryEntry[]) {
    if (!entries.length) return null;

    const typeCounts: Record<string, number> = {};
    let totalElements = 0;
    for (const h of entries) {
        totalElements += h.results.length;
        typeCounts[h.locatorType] = (typeCounts[h.locatorType] || 0) + 1;
    }

    let topType = 'N/A';
    let maxCount = 0;
    for (const [type, count] of Object.entries(typeCounts)) {
        if (count > maxCount) {
            maxCount = count;
            topType = type;
        }
    }

    return { totalSearches: entries.length, totalElements, topType };
}

export function buildCharts(entries: IndexedHistoryEntry[], filter: DateFilter): ChartBundle {
    const typeCounts: Record<string, number> = {};
    for (const entry of entries) {
        typeCounts[entry.locatorType] = (typeCounts[entry.locatorType] || 0) + 1;
    }

    let activityData: ActivityPoint[];

    if (filter.preset === 'all') {
        const dateMap: Record<string, number> = {};
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dateMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
        }
        for (const entry of entries) {
            const dateStr = new Date(entry.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (dateMap[dateStr] !== undefined) dateMap[dateStr]++;
        }
        activityData = Object.keys(dateMap).map((date) => ({ date, searches: dateMap[date] }));
    } else if (filter.preset === 'single') {
        const label = new Date(startOfLocalDay(filter.singleDay)).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
        activityData = [{ date: label, searches: entries.length }];
    } else {
        const from = filter.rangeStart <= filter.rangeEnd ? filter.rangeStart : filter.rangeEnd;
        const to = filter.rangeStart <= filter.rangeEnd ? filter.rangeEnd : filter.rangeStart;
        const spanDays = inclusiveLocalDayCount(from, to);

        if (spanDays > 366) {
            const monthKeys = eachMonthKeyInclusive(from, to);
            const monthMap: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));
            for (const entry of entries) {
                const d = new Date(entry.at);
                const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (monthMap[k] !== undefined) monthMap[k]++;
            }
            activityData = monthKeys.map((k) => {
                const [y, m] = k.split('-').map(Number);
                const d = new Date(y, m - 1, 1);
                return {
                    date: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    searches: monthMap[k],
                };
            });
        } else {
            const dayKeys = eachLocalDayInclusive(from, to);
            const startY = parseInt(from.slice(0, 4), 10);
            const endY = parseInt(to.slice(0, 4), 10);
            const multiYear = startY !== endY;
            const dateMap: Record<string, number> = Object.fromEntries(dayKeys.map((ymd) => [ymd, 0]));
            for (const entry of entries) {
                const ymd = toYMD(new Date(entry.at));
                if (dateMap[ymd] !== undefined) dateMap[ymd]++;
            }
            activityData = dayKeys.map((ymd) => {
                const d = new Date(startOfLocalDay(ymd));
                const date = multiYear
                    ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return { date, searches: dateMap[ymd] };
            });
        }
    }

    const pieData = Object.keys(typeCounts).map((key, index) => ({
        name: key,
        value: typeCounts[key],
        color: CHART_COLORS[index % CHART_COLORS.length],
    }));

    return { activityData, pieData, activityPointCount: activityData.length };
}

export function activityChartTitle(filter: DateFilter): string {
    if (filter.preset === 'all') return 'Search Activity (Last 7 Days)';
    if (filter.preset === 'single') {
        const d = new Date(startOfLocalDay(filter.singleDay));
        return `Search Activity (${d.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })})`;
    }
    const from = filter.rangeStart <= filter.rangeEnd ? filter.rangeStart : filter.rangeEnd;
    const to = filter.rangeStart <= filter.rangeEnd ? filter.rangeEnd : filter.rangeStart;
    const a = new Date(startOfLocalDay(from));
    const b = new Date(endOfLocalDay(to));
    const byMonth = inclusiveLocalDayCount(from, to) > 366;
    return `Search Activity (${a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${b.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}${byMonth ? ', by month' : ''})`;
}

export function runAnalytics(entries: IndexedHistoryEntry[], filter: DateFilter) {
    const t0 = performance.now();
    const filtered = filterHistory(entries, filter);
    const t1 = performance.now();
    const charts = buildCharts(filtered, filter);
    const stats = computeStats(filtered);
    const t2 = performance.now();

    const perf: AnalyticsPerf = {
        filterMs: Math.round(t1 - t0),
        chartMs: Math.round(t2 - t1),
        totalMs: Math.round(t2 - t0),
        recordCount: filtered.length,
        activityPoints: charts.activityPointCount,
    };

    return { filtered, charts, stats, perf };
}
