/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  History,
  Settings,
  ChevronRight,
  Copy,
  Check,
  Trash2,
  Info,
  Globe,
  Briefcase,
  BarChart3,
  Cpu,
  ArrowRight,
  Loader2,
  UserCircle,
  FileSearch,
  MessageSquare,
  Send,
  ShieldCheck,
  AlertCircle,
  FileText
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ResumeBullet, BenchmarkingData } from './types';
import { optimizeAndBenchmark } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Architect State
  const [role, setRole] = useState('');
  const [industry, setIndustry] = useState('');
  const [limit, setLimit] = useState(120);
  const [rawPoint, setRawPoint] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [benchmarking, setBenchmarking] = useState<BenchmarkingData | null>(null);
  const [history, setHistory] = useState<ResumeBullet[]>([]);
  const [copied, setCopied] = useState(false);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('resume_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('resume_history', JSON.stringify(history));
  }, [history]);

  const handleOptimize = async () => {
    if (!role || !rawPoint) return;

    setIsOptimizing(true);
    try {
      const data = await optimizeAndBenchmark({
        role,
        industry,
        characterLimit: limit,
        rawPoint
      });

      if (data) {
        setResult(data.optimizedBullet);
        setBenchmarking(data.benchmarking);

        const newBullet: ResumeBullet = {
          id: crypto.randomUUID(),
          role,
          industry,
          raw: rawPoint,
          optimized: data.optimizedBullet,
          timestamp: Date.now()
        };

        setHistory(prev => [newBullet, ...prev].slice(0, 20));
      }
    } catch (error) {
      console.error('Optimization failed', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsVerifying(true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send OTP');
      }

      setIsOtpSent(true);
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsVerifying(true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid OTP');
      }

      // Save token (in a real app, use secure storage)
      localStorage.setItem('auth_token', data.token);
      setIsLoggedIn(true);
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-100">
              <Cpu className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-serif italic text-3xl font-bold text-slate-900">CareerPro AI</h1>
            <p className="text-slate-500 mt-2">Your multi-module career automation engine.</p>
          </div>

          <div className="glass-card rounded-3xl p-8 shadow-xl shadow-slate-200/50">
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setAuthMode('login')}
                className={cn(
                  "flex-1 py-2 text-sm font-bold transition-all border-b-2",
                  authMode === 'login' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"
                )}
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={cn(
                  "flex-1 py-2 text-sm font-bold transition-all border-b-2",
                  authMode === 'register' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400"
                )}
              >
                Register
              </button>
            </div>

            {isOtpSent ? (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <label className="label-text">Enter 6-Digit Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="input-field text-center text-2xl tracking-[10px] font-bold"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    We sent a verification code to <b>{email}</b>
                  </p>
                </div>

                {authError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" />
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || otp.length < 6}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Verify & Continue
                </button>

                <button
                  type="button"
                  onClick={() => setIsOtpSent(false)}
                  className="w-full text-xs text-slate-400 hover:text-indigo-600 font-medium transition-colors"
                >
                  Use a different email
                </button>
              </form>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-5">
                {authMode === 'register' && (
                  <div>
                    <label className="label-text">Full Name</label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className="label-text">Email Address</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {authError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4" />
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-100 mt-4 flex items-center justify-center gap-2"
                >
                  {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
                  {authMode === 'login' ? 'Sign In with OTP' : 'Create Account'}
                </button>
              </form>
            )}

            {!isOtpSent && (
              <div className="mt-6 text-center">
                <button className="text-xs text-slate-400 hover:text-indigo-600 font-medium transition-colors">
                  Need help? Contact support
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-[10px] text-slate-400 mt-8 uppercase tracking-widest font-bold">
            Secure Enterprise Grade AI
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">
      {/* Sidebar - Navigation & History */}
      <aside className="w-80 border-r border-slate-200 bg-white flex flex-col hidden lg:flex">
        <div className="p-6 border-bottom border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-serif italic text-xl font-bold tracking-tight">CareerPro AI</h1>
        </div>

        <nav className="px-4 py-2 space-y-1">
          <div
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all bg-indigo-50 text-indigo-700"
          >
            <Sparkles className="w-4 h-4" />
            Resume Architect
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between px-2 pt-4">
            <span className="label-text">Architect History</span>
            <History className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <AnimatePresence mode="popLayout">
            {history.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <History className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">No history yet.</p>
              </div>
            ) : (
              history.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="group p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer relative"
                  onClick={() => {
                    setRole(item.role);
                    setIndustry(item.industry || '');
                    setRawPoint(item.raw);
                    setResult(item.optimized);
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistoryItem(item.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 truncate mb-1">{item.role}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {item.optimized}
                  </p>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => setIsLoggedIn(false)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            <UserCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-400">CareerPro AI</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <span className="text-sm font-semibold text-slate-800">
              Resume Architect
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-xs font-bold uppercase tracking-wider">Secure Engine</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {/* Existing Architect UI */}
              <section className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-text">Target Role</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Senior Product Manager"
                        className="input-field pl-10"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-text">Industry (Optional)</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Fintech, SaaS"
                        className="input-field pl-10"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-text">Character Limit (Excluding Spaces)</label>
                    <input
                      type="number"
                      min="20"
                      max="500"
                      className="input-field"
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label-text">Raw Experience Point</label>
                  <textarea
                    placeholder="e.g. I led a team to build a new app that increased revenue by 20%."
                    className="input-field min-h-[120px] resize-none py-4 leading-relaxed"
                    value={rawPoint}
                    onChange={(e) => setRawPoint(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing || !role || !rawPoint}
                  className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Architecting Elite Bullet...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Transform to Elite Bullet</span>
                    </>
                  )}
                </button>
              </section>

              <AnimatePresence>
                {result && (
                  <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-50 rounded-lg">
                            <Cpu className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">Optimized Result</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                              {result.replace(/\s/g, '').length} chars (no spaces)
                            </p>
                          </div>
                        </div>
                        <button onClick={() => copyToClipboard(result)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all border border-slate-200">
                          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy Bullet'}
                        </button>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                        <p className="text-lg font-medium text-slate-800 leading-relaxed font-mono">{result}</p>
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
