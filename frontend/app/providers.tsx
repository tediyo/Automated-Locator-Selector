"use client";

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import SiteVisitTracker from "@/app/SiteVisitTracker";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <SiteVisitTracker />
                {children}
            </AuthProvider>
        </ThemeProvider>
    );
}
