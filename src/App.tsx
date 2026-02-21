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
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

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
  const [authError, setAuthError] = useState<string | null>(null);

  // Fetch History from Supabase
  const loadHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('resume_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load history from Supabase:', err);
    }
  };

  const saveUserToDB = async (userParam: User) => {
    // Optional: save to users table to ensure there is a record
    const { email, user_metadata } = userParam;
    try {
      await supabase.from('users').upsert({
        id: userParam.id,
        email: email,
        name: user_metadata?.full_name || '',
        avatar_url: user_metadata?.avatar_url || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn("Failed to sync user to public table (might not exist yet):", e);
    }
  }

  // Check initial session & listen for changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        saveUserToDB(session.user);
        loadHistory(session.user.id);
      }
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        saveUserToDB(session.user);
        loadHistory(session.user.id);

        // Clean up the URL if Supabase left an empty hash after auth
        if (window.location.hash === '#') {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        setHistory([]); // clear history on logic out
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

      if (data && user) {
        setResult(data.optimizedBullet);
        setBenchmarking(data.benchmarking);

        // Save to Supabase DB
        const newHistoryInsert = {
          user_id: user.id,
          role,
          industry,
          character_limit: limit,
          raw_point: rawPoint,
          optimized_result: data.optimizedBullet
        };

        const { data: insertedData, error } = await supabase
          .from('resume_history')
          .insert([newHistoryInsert])
          .select()
          .single();

        if (error) {
          console.error('Failed to save history to Supabase', error);
        } else if (insertedData) {
          setHistory(prev => [insertedData, ...prev]);
        }
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

  const deleteHistoryItem = async (id: string) => {
    try {
      const { error } = await supabase.from('resume_history').delete().eq('id', id);
      if (error) throw error;
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Failed to delete history item", err);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'Error occurred during Google Sign In');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -translate-y-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
          <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] rounded-full bg-purple-500/5 blur-[120px]" />
        </div>

        <div className="max-w-6xl w-full mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center flex-1 relative z-10 py-12">

          {/* Left Column: Value Prop */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 font-bold text-sm tracking-wide border border-indigo-100/50 shadow-sm">
              <Sparkles className="w-4 h-4" />
              Career Automation Engine
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1]">
              Land the job <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-blue-500 italic font-serif">
                faster.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl">
              Stop agonizing over your resume. Turn raw experience into elite, ATS-optimized bullet points instantly.
            </p>

            <div className="pt-4 grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-lg shadow-slate-200/50 flex items-center justify-center border border-slate-100">
                  <Cpu className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-800">AI Architect</h3>
                <p className="text-sm text-slate-500">Industry-trained generation</p>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-lg shadow-slate-200/50 flex items-center justify-center border border-slate-100">
                  <ShieldCheck className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-bold text-slate-800">Data Secure</h3>
                <p className="text-sm text-slate-500">Private & local history</p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="glass-card rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-900/5 border border-white/60 relative overflow-hidden bg-white/60 backdrop-blur-2xl">
              <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-indigo-500 via-blue-500 to-purple-500" />

              <div className="mb-10 text-center">
                <div className="w-20 h-20 bg-linear-to-br from-indigo-600 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200 rotate-3 transition-transform hover:rotate-0 duration-300">
                  <Cpu className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
                <p className="text-slate-500">Sign in to access your tools.</p>
              </div>

              <div className="space-y-5">
                {authError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{authError}</p>
                  </motion.div>
                )}

                <button
                  onClick={handleGoogleSignIn}
                  className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-200 hover:bg-slate-50 hover:shadow-xl hover:shadow-indigo-100/40 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-linear-to-r from-indigo-50/0 via-indigo-50/50 to-indigo-50/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <svg className="w-6 h-6 z-10 relative" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                    />
                  </svg>
                  <span className="font-bold text-slate-700 group-hover:text-slate-900 z-10 relative transition-colors">Continue with Google</span>
                </button>
              </div>

              <div className="mt-8 text-center border-t border-slate-100 pt-8">
                <p className="text-xs text-slate-400 font-medium">By continuing, you agree to our Terms of Service & Privacy Policy.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">
      {/* Sidebar - Navigation & History */}
      <aside className="w-80 border-r border-slate-200 bg-white flex-col hidden lg:flex">
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
                    setLimit(item.character_limit || 120);
                    setRawPoint(item.raw_point);
                    setResult(item.optimized_result);
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
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 truncate mb-1">{item.role}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {item.optimized_result}
                  </p>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleSignOut}
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
                        className="input-field pl-10!"
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
                        className="input-field pl-10!"
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
                    className="input-field min-h-30 resize-none py-4 leading-relaxed"
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
