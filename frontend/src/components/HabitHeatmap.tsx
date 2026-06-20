'use client';

import React from 'react';
import { CheckIn } from '../services/api';

interface HabitHeatmapProps {
  checkIns: CheckIn[];
  color: string; // Habit theme color class/hex
}

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({ checkIns, color }) => {
  // Generate the last 12 weeks of dates (84 days) ending today
  const getHeatmapDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0); // avoid timezone shifts

    // Find the Sunday of the week 11 weeks ago
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() - 11 * 7);

    // Loop through 84 days
    for (let i = 0; i < 84; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      days.push({
        dateStr,
        dayOfWeek: date.getDay(),
        dateObj: date,
      });
    }
    return days;
  };

  const days = getHeatmapDays();
  const doneDates = new Set(checkIns.filter((ci) => ci.status === 'done').map((ci) => ci.date));

  // Tailwind theme maps for colors
  const getColorClasses = (isCompleted: boolean) => {
    if (!isCompleted) return 'bg-neutral-800 border-neutral-700/50';

    // Map color themes dynamically
    switch (color?.toLowerCase()) {
      case 'blue':
        return 'bg-blue-500 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
      case 'red':
        return 'bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
      case 'green':
        return 'bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'purple':
        return 'bg-purple-500 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]';
      case 'yellow':
        return 'bg-amber-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      default:
        return 'bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    }
  };

  // Group into 12 columns of 7 rows (weeks)
  const columns = [];
  for (let i = 0; i < 12; i++) {
    columns.push(days.slice(i * 7, (i + 1) * 7));
  }

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="flex flex-col bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 backdrop-blur-md">
      <h4 className="text-xs font-semibold text-neutral-400 mb-3 tracking-wide uppercase">
        Last 12 Weeks Completion History
      </h4>
      <div className="flex gap-2 items-start justify-center overflow-x-auto py-1">
        {/* Row labels */}
        <div className="grid grid-rows-7 gap-1 text-[9px] font-medium text-neutral-500 pr-1 h-[116px]">
          {weekdays.map((day, idx) => (
            <div key={idx} className="h-3 flex items-center justify-center w-2">
              {idx % 2 === 0 ? day : ''}
            </div>
          ))}
        </div>

        {/* Heatmap grid columns */}
        <div className="flex gap-1.5 h-[116px]">
          {columns.map((week, colIdx) => (
            <div key={colIdx} className="grid grid-rows-7 gap-1 h-full">
              {week.map((day) => {
                const isCompleted = doneDates.has(day.dateStr);
                const dateDisplay = day.dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
                return (
                  <div
                    key={day.dateStr}
                    title={`${dateDisplay}: ${isCompleted ? 'Completed' : 'No check-in'}`}
                    className={`w-3 h-3 rounded-sm border transition-all duration-300 ${getColorClasses(
                      isCompleted
                    )} hover:scale-125 cursor-pointer`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between items-center mt-3 text-[10px] text-neutral-500 border-t border-neutral-800/80 pt-2 px-1">
        <span>12 Weeks Ago</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-neutral-800 border border-neutral-700/50" />
          <div
            className={`w-2.5 h-2.5 rounded-sm border ${
              color === 'blue'
                ? 'bg-blue-500 border-blue-400'
                : color === 'red'
                ? 'bg-rose-500 border-rose-400'
                : color === 'purple'
                ? 'bg-purple-500 border-purple-400'
                : color === 'yellow'
                ? 'bg-amber-500 border-amber-400'
                : 'bg-emerald-500 border-emerald-400'
            }`}
          />
          <span>More</span>
        </div>
        <span>Today</span>
      </div>
    </div>
  );
};
