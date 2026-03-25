"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProfileData {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    photoUrl: string;
    isGoogleUser: boolean;
}

export default function ProfilePage() {
    const { user, token, isGuest, logout, isLoading } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [editing, setEditing] = useState(false);
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (!isLoading && !user && !isGuest) router.push('/login');
    }, [user, isGuest, isLoading, router]);

    useEffect(() => {
        if (!token) return;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        fetch(`${apiUrl}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                setProfile(data);
                setFullName(data.fullName || '');
                setPhoneNumber(data.phoneNumber || '');
            })
    }, [token]);

    const handleSave = async () => {
        if (!token) return;
        setSaving(true);
        setSaveMsg(null);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/users/me`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, phoneNumber }),
            });
            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
                setFullName(updated.fullName);
                setPhoneNumber(updated.phoneNumber || '');
                setEditing(false);
                setSaveMsg({ type: 'success', text: 'Profile updated successfully.' });
            } else {
                setSaveMsg({ type: 'error', text: 'Failed to save changes. Please try again.' });
            }
        } catch {
            setSaveMsg({ type: 'error', text: 'Network error. Please check your connection.' });
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMsg(null), 4000);
        }
    };

    const initials = (profile?.fullName || user?.email || 'U')
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    if (isLoading || (!user && !isGuest)) {
        return <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>Loading...</div>;
    }

    if (isGuest) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="card w-full max-w-md p-8 space-y-5 text-center">
                    <h1 className="text-2xl font-bold text-amber-500">Profile</h1>
                    <p style={{ color: 'var(--muted)' }}>Create an account to access your profile.</p>
                    <Link href="/signup" className="block w-full btn-primary py-2.5 rounded-lg mt-4">Sign Up</Link>
                    <Link href="/dashboard" className="block text-sm mt-2" style={{ color: 'var(--muted)' }}>← Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between gap-3 mt-2 mb-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="text-sm px-3 py-1.5 rounded-md transition-all font-medium hover:bg-[var(--surface-hover)] shadow-sm shrink-0" style={{ color: 'var(--foreground)', background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                        ← Back
                    </Link>
                    <h1 className="text-lg font-bold tracking-tight text-[var(--foreground)]">My Profile</h1>
                </div>
                <button onClick={toggleTheme} className="theme-toggle scale-90 opacity-70 hover:opacity-100 transition-opacity" title="Toggle theme">
                    {theme === 'dark' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    )}
                </button>
            </header>

            {/* Avatar card */}
            <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full shrink-0 overflow-hidden shadow-md" style={{ background: 'var(--accent)' }}>
                    {profile?.photoUrl ? (
                        <img
                            src={profile.photoUrl}
                            alt={profile?.fullName || 'Profile photo'}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'; }}
                        />
                    ) : null}
                    <div
                        className="w-full h-full flex items-center justify-center text-2xl font-bold"
                        style={{ display: profile?.photoUrl ? 'none' : 'flex', color: '#000' }}
                    >
                        {initials}
                    </div>
                </div>
                <div className="flex-1 text-center sm:text-left min-w-0">
                    <p className="text-xl font-bold truncate" style={{ color: 'var(--foreground)' }}>{profile?.fullName || '—'}</p>
                    <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{profile?.email}</p>
                    <div className="mt-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                            {profile?.isGoogleUser ? 'Google Account' : 'Email Account'}
                        </span>
                    </div>
                </div>
                {!editing && (
                    <button
                        onClick={() => { setEditing(true); setSaveMsg(null); }}
                        className="text-xs px-3 py-1.5 rounded-md border transition-all font-medium shrink-0 hover:bg-[var(--surface-hover)]"
                        style={{ color: 'var(--foreground)', background: 'var(--surface)', borderColor: 'var(--card-border)' }}
                    >
                        Edit
                    </button>
                )}
            </div>

            {/* Save feedback */}
            {saveMsg && (
                <div className={`text-sm px-4 py-2.5 rounded-lg border font-medium ${saveMsg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'}`}>
                    {saveMsg.text}
                </div>
            )}

            {/* Profile fields */}
            <div className="card p-6 space-y-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Account Details</h2>

                {/* Full Name */}
                <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Full Name</label>
                    {editing ? (
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            className="input-field w-full text-sm"
                            placeholder="Your full name"
                        />
                    ) : (
                        <p className="text-sm font-medium py-2 px-3 rounded-md" style={{ background: 'var(--code-bg)', color: 'var(--foreground)' }}>
                            {profile?.fullName || <span style={{ color: 'var(--muted)' }}>Not set</span>}
                        </p>
                    )}
                </div>

                {/* Email (read-only) */}
                <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Email Address</label>
                    <p className="text-sm font-medium py-2 px-3 rounded-md" style={{ background: 'var(--code-bg)', color: 'var(--muted-strong)' }}>
                        {profile?.email}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Email cannot be changed.</p>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Phone Number <span className="opacity-50">(optional)</span></label>
                    {editing ? (
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value)}
                            className="input-field w-full text-sm"
                            placeholder="+1 234 567 890"
                        />
                    ) : (
                        <p className="text-sm font-medium py-2 px-3 rounded-md" style={{ background: 'var(--code-bg)', color: 'var(--foreground)' }}>
                            {profile?.phoneNumber || <span style={{ color: 'var(--muted)' }}>Not set</span>}
                        </p>
                    )}
                </div>

                {/* Edit action buttons */}
                {editing && (
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary text-sm px-5 py-2 rounded-md"
                        >
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button
                            onClick={() => { setEditing(false); setFullName(profile?.fullName || ''); setPhoneNumber(profile?.phoneNumber || ''); }}
                            className="text-sm px-4 py-2 rounded-md border transition-all"
                            style={{ color: 'var(--muted)', background: 'var(--surface)', borderColor: 'var(--card-border)' }}
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Danger zone */}
            <div className="card p-6 space-y-3 border border-red-500/10">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-red-500/70">Session</h2>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Sign out from all devices and sessions.</p>
                <button
                    onClick={logout}
                    className="text-sm px-4 py-2 rounded-md border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all font-medium"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}
