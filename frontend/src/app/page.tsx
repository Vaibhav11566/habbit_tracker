'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, Habit, DashboardData, DashboardDaySummary } from '../services/api';
import { HabitHeatmap } from '../components/HabitHeatmap';
import { HabitModal } from '../components/HabitModal';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { 
  Plus, 
  LogOut, 
  Sparkles, 
  CheckCircle2, 
  Flame, 
  Activity,
  ChevronDown, 
  ChevronUp, 
  Edit3,
  Calendar,
  Lock,
  User,
  Mail,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const { 
    user, 
    token, 
    loading: authLoading, 
    isFirebaseConfigured, 
    loginWithMock, 
    loginWithFirebase, 
    signupWithFirebase, 
    logout 
  } = useAuth();

  // Auth form states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mockUidInput, setMockUidInput] = useState('john-doe');
  const [authError, setAuthError] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // App states
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHabitForEdit, setSelectedHabitForEdit] = useState<Habit | null>(null);

  // Load dashboard
  const loadDashboard = async () => {
    if (!token) return;
    setLoadingDashboard(true);
    try {
      const data = await api.getDashboard(token);
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  // Trigger Capacitor Haptic vibration
  const triggerCheckInHaptics = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else {
        console.log('Haptic Feedback: Impact Medium (Web Fallback)');
      }
    } catch (err) {
      console.error('Haptics failed:', err);
    }
  };

  // Check-in toggle handler
  const handleCheckInToggle = async (habitId: string) => {
    if (!token || !dashboardData) return;
    try {
      const todayStr = dashboardData.todayStr;

      // Find original habit completion state
      const habitIndex = dashboardData.todayHabits.findIndex(h => h._id === habitId);
      if (habitIndex === -1) return;
      const isCurrentlyCompleted = dashboardData.todayHabits[habitIndex].isCompleted;

      // Trigger haptic vibration on success check-in
      if (!isCurrentlyCompleted) {
        await triggerCheckInHaptics();
      }

      // Call API
      const response = await api.toggleCheckIn(token, habitId, todayStr);

      // Perform local state update for snappy visual experience
      const updatedHabits = [...dashboardData.todayHabits];
      updatedHabits[habitIndex] = {
        ...updatedHabits[habitIndex],
        ...response.data,
        isCompleted: response.action === 'done'
      };

      const completedCount = updatedHabits.filter(h => h.isCompleted).length;
      const totalCount = updatedHabits.length;
      const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      // Update weekly strip summary day
      const updatedWeeklySummary = dashboardData.weeklySummary.map(day => {
        if (day.date === todayStr) {
          return {
            ...day,
            completed: completedCount,
            percentage: completionPercentage
          };
        }
        return day;
      });

      setDashboardData({
        ...dashboardData,
        todayHabits: updatedHabits,
        completionPercentage,
        weeklySummary: updatedWeeklySummary
      });

    } catch (err) {
      console.error('Error toggling check-in:', err);
    }
  };

  // Habit modal submit handler
  const handleHabitSubmit = async (data: any) => {
    if (!token) return;
    try {
      if (selectedHabitForEdit) {
        await api.updateHabit(token, selectedHabitForEdit._id, data);
      } else {
        await api.createHabit(token, data);
      }
      loadDashboard();
    } catch (err) {
      console.error('Error saving habit:', err);
      throw err;
    }
  };

  // Habit delete handler
  const handleHabitDelete = async (id: string) => {
    if (!token) return;
    try {
      await api.deleteHabit(token, id);
      if (expandedHabitId === id) setExpandedHabitId(null);
      loadDashboard();
    } catch (err) {
      console.error('Error deleting habit:', err);
      throw err;
    }
  };

  // Auth submission handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSubmittingAuth(true);
    try {
      if (isSignUp) {
        await signupWithFirebase(email, password, name);
      } else {
        await loginWithFirebase(email, password);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleMockLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockUidInput.trim()) {
      setAuthError('Mock ID is required');
      return;
    }
    const safeUid = mockUidInput.trim().toLowerCase().replace(/\s+/g, '-');
    loginWithMock(safeUid);
  };

  // Color mapping helper
  const getColorScheme = (colorName: string) => {
    switch (colorName?.toLowerCase()) {
      case 'blue':
        return { text: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10', bar: 'bg-blue-500', fill: 'bg-blue-500' };
      case 'red':
        return { text: 'text-rose-400', border: 'border-rose-500/20', bg: 'bg-rose-500/10', bar: 'bg-rose-500', fill: 'bg-rose-500' };
      case 'green':
        return { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', fill: 'bg-emerald-500' };
      case 'purple':
        return { text: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/10', bar: 'bg-purple-500', fill: 'bg-purple-500' };
      case 'yellow':
        return { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10', bar: 'bg-amber-500', fill: 'bg-amber-500' };
      default:
        return { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', fill: 'bg-emerald-500' };
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-indigo-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-400 text-sm font-semibold tracking-wide">Syncing Habit Workspace...</p>
        </div>
      </div>
    );
  }

  // Not Logged In screen
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-neutral-950 via-neutral-900 to-indigo-950 text-white">
        <div className="w-full max-w-md bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-lg flex flex-col space-y-6">
          {/* App Header */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-14 h-14 bg-indigo-600/20 border border-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-indigo-300 bg-clip-text text-transparent">
              HabitFlow
            </h1>
            <p className="text-neutral-400 text-xs tracking-wide uppercase">Phase 1 MVP Habit System</p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Firebase Authentication Option */}
          {isFirebaseConfigured ? (
            <div className="space-y-4">
              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {isSignUp && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submittingAuth}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-indigo-600/10 disabled:opacity-50"
                >
                  {submittingAuth ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>

              <div className="relative flex items-center justify-center my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-800" />
                </div>
                <span className="relative bg-neutral-900 px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                  OR DEVELOPMENT MODE
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-950/40 border border-indigo-500/10 rounded-xl p-3.5 flex flex-col space-y-2">
              <span className="text-xs text-indigo-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Mock Engine Activated
              </span>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Firebase credentials are not set in the environment. Run in local development bypass mode by entering any name or ID.
              </p>
            </div>
          )}

          {/* Local Mock Auth Form */}
          <form onSubmit={handleMockLoginSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Mock Account Username / UID</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="e.g. john-doe, user123"
                  value={mockUidInput}
                  onChange={(e) => setMockUidInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-semibold rounded-xl transition border border-neutral-700/60"
            >
              Sign In with Mock Profile
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-indigo-950 text-white p-4 pb-20 flex flex-col">
      {/* Header Container */}
      <div className="max-w-lg mx-auto w-full flex justify-between items-center py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-md font-bold leading-tight">HabitFlow</h2>
            <span className="text-[10px] text-neutral-400 font-medium">Hello, {user.displayName}</span>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2.5 bg-neutral-900/60 border border-neutral-800 hover:bg-neutral-800 rounded-xl transition text-neutral-400 hover:text-white"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col space-y-6 mt-2">
        {/* Progress Card */}
        {dashboardData && (
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-5 backdrop-blur-lg flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold tracking-tight">Today&apos;s Focus</h3>
              <p className="text-xs text-neutral-400 leading-normal">
                {dashboardData.todayHabits.length > 0
                  ? `Completed ${dashboardData.todayHabits.filter((h) => h.isCompleted).length} of ${
                      dashboardData.todayHabits.length
                    } habits`
                  : 'No habits scheduled for today.'}
              </p>
            </div>
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              {/* Progress Ring */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-neutral-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-500 transition-all duration-500 ease-out"
                  strokeDasharray={`${dashboardData.completionPercentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-xs font-black">{dashboardData.completionPercentage}%</div>
            </div>
          </div>
        )}

        {/* Weekly strip tracker */}
        {dashboardData && (
          <div className="bg-neutral-900/20 border border-neutral-850 rounded-2xl p-4 flex flex-col space-y-3">
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider flex items-center gap-1.5 px-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" /> Weekly Streak Calendar
            </span>
            <div className="grid grid-cols-7 gap-2.5">
              {dashboardData.weeklySummary.map((day: DashboardDaySummary) => {
                const isToday = day.date === dashboardData.todayStr;
                return (
                  <div
                    key={day.date}
                    className={`flex flex-col items-center py-2 rounded-xl border transition-all ${
                      isToday
                        ? 'bg-indigo-650/15 border-indigo-500/40 ring-1 ring-indigo-500/20 scale-[1.03]'
                        : 'bg-neutral-900/30 border-neutral-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-neutral-400">{day.dayName}</span>
                    <span className={`text-xs font-black mt-1 ${isToday ? 'text-indigo-400' : 'text-white'}`}>
                      {day.date.split('-')[2]}
                    </span>
                    {/* Tiny Progress Indicator */}
                    <div className="w-1.5 h-6 bg-neutral-800 rounded-full mt-2 overflow-hidden flex items-end">
                      <div
                        style={{ height: `${day.percentage}%` }}
                        className={`w-full rounded-full transition-all duration-300 ${
                          day.percentage === 100
                            ? 'bg-emerald-500'
                            : day.percentage > 0
                            ? 'bg-indigo-500'
                            : 'bg-transparent'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Habits Checklist */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-md font-bold tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Scheduled Today
            </h3>
            <button
              onClick={() => {
                setSelectedHabitForEdit(null);
                setIsModalOpen(true);
              }}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 rounded-lg text-white font-bold flex items-center gap-1.5 text-xs transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Habit
            </button>
          </div>

          {loadingDashboard && !dashboardData && (
            <div className="text-center py-8 text-neutral-500 text-sm">Loading today&apos;s checklist...</div>
          )}

          {dashboardData && dashboardData.todayHabits.length === 0 && (
            <div className="text-center py-10 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-2xl p-6">
              <p className="text-neutral-400 text-sm font-medium">No habits scheduled for today.</p>
              <button
                onClick={() => {
                  setSelectedHabitForEdit(null);
                  setIsModalOpen(true);
                }}
                className="mt-3 text-xs font-semibold text-indigo-400 hover:underline"
              >
                Create a habit now
              </button>
            </div>
          )}

          {dashboardData &&
            dashboardData.todayHabits.map((habit) => {
              const colors = getColorScheme(habit.color);
              const isExpanded = expandedHabitId === habit._id;
              return (
                <div
                  key={habit._id}
                  className={`bg-neutral-900/40 border ${
                    isExpanded ? 'border-neutral-700/80 shadow-lg' : 'border-neutral-850 hover:border-neutral-800'
                  } rounded-2xl overflow-hidden transition-all duration-300`}
                >
                  {/* Card Content Row */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    {/* Tap to expand details */}
                    <div
                      onClick={() => setExpandedHabitId(isExpanded ? null : habit._id)}
                      className="flex items-center gap-3 flex-1 cursor-pointer select-none"
                    >
                      <div className={`w-11 h-11 ${colors.bg} rounded-xl border ${colors.border} flex items-center justify-center text-2xl`}>
                        {habit.icon}
                      </div>
                      <div className="space-y-1">
                        <h4 className={`text-sm font-extrabold ${habit.isCompleted ? 'line-through text-neutral-500' : 'text-white'}`}>
                          {habit.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-neutral-950/30 border border-neutral-800/80 text-neutral-400 px-1.5 py-0.5 rounded-md font-bold uppercase">
                            {habit.frequency}
                          </span>
                          {habit.reminderTime && (
                            <span className="text-[10px] text-neutral-500 font-bold flex items-center gap-0.5">
                              ⏰ {habit.reminderTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Streak Fire tag */}
                    {habit.currentStreak > 0 && (
                      <div className="flex items-center gap-1 text-[11px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{habit.currentStreak}</span>
                      </div>
                    )}

                    {/* Checkbox Trigger */}
                    <button
                      onClick={() => handleCheckInToggle(habit._id)}
                      className={`p-1.5 rounded-xl border transition-all ${
                        habit.isCompleted
                          ? `${colors.fill} border-transparent text-neutral-950 scale-105`
                          : 'border-neutral-700/60 text-transparent hover:border-indigo-500'
                      }`}
                    >
                      <CheckCircle2 className={`w-6 h-6 ${habit.isCompleted ? 'text-neutral-950 stroke-[3]' : 'text-neutral-700/40'}`} />
                    </button>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-neutral-850 bg-neutral-950/30 p-4 space-y-4 animate-in slide-in-from-top duration-200">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 text-center">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-500">Current Streak</span>
                          <p className="text-xl font-black text-amber-500 mt-1 flex items-center justify-center gap-1">
                            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" /> {habit.currentStreak} days
                          </p>
                        </div>
                        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 text-center">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-500">Longest Streak</span>
                          <p className="text-xl font-black text-indigo-400 mt-1">🏆 {habit.longestStreak} days</p>
                        </div>
                        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex flex-col justify-center items-center">
                          <button
                            onClick={() => {
                              setSelectedHabitForEdit(habit);
                              setIsModalOpen(true);
                            }}
                            className="w-full h-full flex items-center justify-center gap-1.5 text-xs font-bold text-neutral-450 hover:text-white transition"
                          >
                            <Edit3 className="w-4 h-4" /> Edit Details
                          </button>
                        </div>
                      </div>

                      {/* Heatmap Widget */}
                      <HabitHeatmap checkIns={habit.checkIns || []} color={habit.color} />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Floating Action / Habit Form Modal */}
      <HabitModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedHabitForEdit(null);
        }}
        onSubmit={handleHabitSubmit}
        habit={selectedHabitForEdit}
        onDelete={handleHabitDelete}
      />
    </div>
  );
}
