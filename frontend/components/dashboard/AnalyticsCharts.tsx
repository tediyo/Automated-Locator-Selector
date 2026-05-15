'use client';

import { memo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import type { ActivityPoint, PiePoint } from '@/lib/dashboard-analytics';

const tooltipStyle = {
    backgroundColor: 'var(--surface)',
    borderColor: 'var(--card-border)',
    color: 'var(--foreground)',
    borderRadius: '8px',
};

export const ActivityAreaChart = memo(function ActivityAreaChart({
    data,
}: {
    data: ActivityPoint[];
}) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="date" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                    isAnimationActive={false}
                />
                <Area
                    type="monotone"
                    dataKey="searches"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSearches)"
                    isAnimationActive={false}
                    dot={false}
                    activeDot={{ r: 4 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
});

export const LocatorTypePieChart = memo(function LocatorTypePieChart({ data }: { data: PiePoint[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                    isAnimationActive={false}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ fontWeight: 'bold' }}
                    isAnimationActive={false}
                />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', color: 'var(--foreground)' }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
});
