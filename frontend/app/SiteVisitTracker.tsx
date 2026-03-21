"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

async function trackVisit(page: string) {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        await fetch(`${apiUrl}/notification/visit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ page }),
        });
    } catch {
        // Silently fail – don't affect user experience
    }
}

export default function SiteVisitTracker() {
    const pathname = usePathname();

    // Fire on every full page load / refresh
    useEffect(() => {
        trackVisit(window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Also fire on client-side navigation (route changes)
    useEffect(() => {
        trackVisit(pathname);
    }, [pathname]);

    return null;
}
