"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('http://localhost:3001/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => router.push('/login'), 2000);
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch (err) {
            setError('Connection error');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="glass w-full max-w-md p-8 space-y-6 shadow-2xl">
                <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Create Account
                </h1>
                <p className="text-slate-400 text-center">Join the QA Locator Tool</p>

                {error && <p className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm">{error}</p>}
                {success && <p className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded text-sm">Account created! Redirecting to login...</p>}

                {!success && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300">Email</label>
                            <input
                                type="email"
                                required
                                className="mt-1 block w-full bg-slate-800 border-slate-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300">Password</label>
                            <input
                                type="password"
                                required
                                className="mt-1 block w-full bg-slate-800 border-slate-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full btn-primary text-white font-bold py-2 rounded-md transition-all shadow-lg"
                        >
                            Sign Up
                        </button>
                    </form>
                )}
                <p className="text-center text-sm text-slate-400">
                    Already have an account? <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Log in</Link>
                </p>
            </div>
        </div>
    );
}
