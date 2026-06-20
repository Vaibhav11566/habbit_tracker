import CheckIn from '../models/CheckIn.js';

// Parse YYYY-MM-DD into a local Date at 12:00 PM to avoid DST issues
const parseDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

// Format a Date object back to YYYY-MM-DD
const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Check if habit is scheduled on a given Date
const isHabitScheduledOn = (date, habit) => {
  if (habit.frequency === 'daily') {
    return true;
  }
  if (habit.frequency === 'custom') {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    return habit.customDays.includes(dayOfWeek);
  }
  if (habit.frequency === 'weekly') {
    return true;
  }
  return false;
};

// Check if there are scheduled days strictly between d1Str and d2Str
const hasScheduledDaysBetween = (d1Str, d2Str, habit) => {
  if (habit.frequency === 'weekly') {
    return false;
  }

  const d1 = parseDate(d1Str);
  const d2 = parseDate(d2Str);

  const timeDiff = d2.getTime() - d1.getTime();
  const dayDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));

  if (dayDiff <= 1) {
    return false;
  }

  for (let i = 1; i < dayDiff; i++) {
    const checkDate = new Date(d1.getTime() + i * 24 * 60 * 60 * 1000);
    if (isHabitScheduledOn(checkDate, habit)) {
      return true;
    }
  }

  return false;
};

// Get the Sunday start-of-week date for a given YYYY-MM-DD date
const getWeekStartStr = (dateStr) => {
  const date = parseDate(dateStr);
  const day = date.getDay(); // 0 is Sunday
  const diff = date.getDate() - day; // adjust back to Sunday
  const sunday = new Date(date.setDate(diff));
  return formatDate(sunday);
};

export const getTodayStr = () => {
  const d = new Date();
  return formatDate(d);
};

export const recalculateStreaks = async (habit, inputTodayStr) => {
  const todayStr = inputTodayStr || getTodayStr();

  // Find all 'done' check-ins for this habit
  const checkIns = await CheckIn.find({
    habitId: habit._id,
    status: 'done',
  });

  if (checkIns.length === 0) {
    habit.currentStreak = 0;
    habit.longestStreak = 0;
    await habit.save();
    return habit;
  }

  // Sort done dates chronologically
  const doneDates = [...new Set(checkIns.map((ci) => ci.date))].sort();

  let maxStreak = 0;
  let currentStreak = 0;

  if (habit.frequency === 'daily' || habit.frequency === 'custom') {
    let streak = 0;

    for (let i = 0; i < doneDates.length; i++) {
      if (i === 0) {
        streak = 1;
      } else {
        const prevDateStr = doneDates[i - 1];
        const currDateStr = doneDates[i];

        if (hasScheduledDaysBetween(prevDateStr, currDateStr, habit)) {
          // Streak was broken
          streak = 1;
        } else {
          // No scheduled days were skipped
          streak += 1;
        }
      }
      maxStreak = Math.max(maxStreak, streak);
    }

    // Determine current streak validity
    const lastDoneDateStr = doneDates[doneDates.length - 1];
    if (lastDoneDateStr === todayStr) {
      currentStreak = streak;
    } else if (!hasScheduledDaysBetween(lastDoneDateStr, todayStr, habit)) {
      // No scheduled days have been missed yet
      currentStreak = streak;
    } else {
      // A scheduled day was missed
      currentStreak = 0;
    }
  } else if (habit.frequency === 'weekly') {
    // Group check-ins by week-start (Sunday)
    const weeksCompleted = [...new Set(doneDates.map(getWeekStartStr))].sort();

    let streak = 0;

    for (let i = 0; i < weeksCompleted.length; i++) {
      if (i === 0) {
        streak = 1;
      } else {
        const w1 = parseDate(weeksCompleted[i - 1]);
        const w2 = parseDate(weeksCompleted[i]);

        const diffTime = w2.getTime() - w1.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 7) {
          streak += 1;
        } else {
          streak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, streak);
    }

    // Determine current streak validity for weekly habit
    const currentWeekStart = getWeekStartStr(todayStr);
    const lastCompletedWeekStart = weeksCompleted[weeksCompleted.length - 1];

    if (lastCompletedWeekStart === currentWeekStart) {
      currentStreak = streak;
    } else {
      const w1 = parseDate(lastCompletedWeekStart);
      const w2 = parseDate(currentWeekStart);
      const diffTime = w2.getTime() - w1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 7) {
        // Last completion was the previous week; user has this week to keep it alive
        currentStreak = streak;
      } else {
        currentStreak = 0;
      }
    }
  }

  habit.currentStreak = currentStreak;
  habit.longestStreak = Math.max(habit.longestStreak || 0, maxStreak);
  await habit.save();
  return habit;
};
