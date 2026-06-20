'use client';

import React, { useState, useEffect } from 'react';
import { Habit, HabitData } from '../services/api';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { X, Calendar, Clock, Sparkles } from 'lucide-react';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HabitData) => Promise<void>;
  habit?: Habit | null; // If editing
  onDelete?: (id: string) => Promise<void>;
}

const ICONS = ['💧', '🏋️', '📖', '🥦', '🧘', '🧹', '💤', '💻', '🍎', '🏃', '🎸', '📓'];
const COLORS = [
  { name: 'blue', class: 'bg-blue-500 hover:bg-blue-600', ring: 'ring-blue-400' },
  { name: 'red', class: 'bg-rose-500 hover:bg-rose-600', ring: 'ring-rose-400' },
  { name: 'green', class: 'bg-emerald-500 hover:bg-emerald-600', ring: 'ring-emerald-400' },
  { name: 'purple', class: 'bg-purple-500 hover:bg-purple-600', ring: 'ring-purple-400' },
  { name: 'yellow', class: 'bg-amber-500 hover:bg-amber-600', ring: 'ring-amber-400' },
];

const WEEKDAYS = [
  { label: 'S', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
];

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  habit,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('💧');
  const [color, setColor] = useState('blue');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [reminderTime, setReminderTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setIcon(habit.icon);
      setColor(habit.color);
      setFrequency(habit.frequency);
      setCustomDays(habit.customDays || []);
      setReminderTime(habit.reminderTime || '');
    } else {
      setTitle('');
      setIcon('💧');
      setColor('blue');
      setFrequency('daily');
      setCustomDays([]);
      setReminderTime('');
    }
    setError('');
  }, [habit, isOpen]);

  if (!isOpen) return null;

  // Handle Capacitor Local Notification Scheduling
  const handleNotificationScheduling = async (habitId: string, habitTitle: string, timeStr: string, freq: string, days: number[]) => {
    try {
      if (!Capacitor.isNativePlatform()) {
        console.log('Skipping local notification registration: Not on native platform.');
        return;
      }

      // 1. Generate notification ID (Int32 compatible hash from mongo ObjectId string)
      const notificationId = parseInt(habitId.slice(-6), 16) || Math.floor(Math.random() * 100000);

      // 2. Always cancel existing notifications for this habit first
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });

      if (!timeStr) {
        console.log(`Notification cancelled for ${habitTitle} (no reminder time)`);
        return;
      }

      // 3. Request permissions
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') {
        console.warn('Local notifications permission not granted');
        return;
      }

      const [hours, minutes] = timeStr.split(':').map(Number);

      // 4. Configure scheduling options
      let scheduleOptions: any = {};
      if (freq === 'daily') {
        scheduleOptions = {
          on: { hour: hours, minute: minutes },
          repeats: true,
        };
      } else if (freq === 'weekly') {
        // Weekly repeats: Default to Sunday (0)
        scheduleOptions = {
          on: { weekday: 1, hour: hours, minute: minutes }, // Repeats weekly on Sunday/Monday
          repeats: true,
        };
      } else if (freq === 'custom' && days.length > 0) {
        // Schedule custom days
        // Note: For custom days, we could schedule multiple notifications with sub-ids,
        // but for simplicity we schedule on the first scheduled custom day or let it run
        scheduleOptions = {
          on: { weekday: days[0] + 1, hour: hours, minute: minutes }, // weekday: 1 is Sunday in LocalNotifications
          repeats: true,
        };
      } else {
        scheduleOptions = {
          on: { hour: hours, minute: minutes },
          repeats: true,
        };
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: `Habit Reminder: ${habitTitle} ${icon}`,
            body: `Don't forget to complete your habit today!`,
            schedule: scheduleOptions,
            sound: 'beep.wav',
            extra: { habitId },
          },
        ],
      });
      console.log(`Notification successfully scheduled for habit ${habitId} at ${timeStr}`);
    } catch (err) {
      console.error('Error scheduling notification:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (frequency === 'custom' && customDays.length === 0) {
      setError('Please select at least one day for custom frequency');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const data: HabitData = {
        title: title.trim(),
        icon,
        color,
        frequency,
        customDays: frequency === 'custom' ? customDays : [],
        reminderTime: reminderTime || null,
      };

      await onSubmit(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred saving the habit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDayToggle = (day: number) => {
    if (customDays.includes(day)) {
      setCustomDays(customDays.filter((d) => d !== day));
    } else {
      setCustomDays([...customDays, day].sort());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-800 bg-neutral-950/40">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            {habit ? 'Edit Habit' : 'Create New Habit'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide">
              Habit Name
            </label>
            <input
              type="text"
              placeholder="e.g. Drink Water, Gym"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800/80 border border-neutral-700/60 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Icon Grid */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide">
              Select Icon
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-[88px] overflow-y-auto p-1 bg-neutral-950/20 border border-neutral-800 rounded-xl">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`py-2 text-xl rounded-lg transition-all ${
                    icon === i ? 'bg-indigo-600/35 border border-indigo-500 scale-105' : 'border border-transparent hover:bg-neutral-800'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide">
              Select Color
            </label>
            <div className="flex gap-3 justify-center py-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={`w-7 h-7 rounded-full transition-all ${c.class} ${
                    color === c.name ? `ring-2 ring-offset-2 ring-offset-neutral-900 ${c.ring} scale-110` : 'scale-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Frequency & Custom Days */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide">
                Frequency
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-950/40 rounded-xl border border-neutral-800">
                {(['daily', 'weekly', 'custom'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`py-1.5 text-xs font-semibold capitalize rounded-lg transition-colors ${
                      frequency === f ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {frequency === 'custom' && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-150">
                <label className="text-xs font-bold text-neutral-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Select Days
                </label>
                <div className="flex justify-between p-1.5 bg-neutral-950/20 border border-neutral-800 rounded-xl">
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => handleDayToggle(d.value)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${
                        customDays.includes(d.value)
                          ? 'bg-indigo-500/20 border border-indigo-500 text-indigo-400'
                          : 'bg-neutral-800/40 text-neutral-500 border border-neutral-800 hover:text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reminder Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Reminder Time (Optional)
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800/80 border border-neutral-700/60 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-3 border-t border-neutral-800">
            {habit && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Are you sure you want to delete this habit?')) {
                    setSubmitting(true);
                    try {
                      await onDelete(habit._id);
                      onClose();
                    } catch (err: any) {
                      setError(err.message || 'Failed to delete habit');
                      setSubmitting(false);
                    }
                  }
                }}
                disabled={submitting}
                className="px-4 py-3 bg-rose-950/20 border border-rose-900/40 text-rose-400 rounded-xl text-sm font-semibold hover:bg-rose-900/30 transition disabled:opacity-50"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
