import Habit from '../models/Habit.js';
import CheckIn from '../models/CheckIn.js';
import { getTodayStr } from '../utils/streak.js';

// Helper to parse date without timezone shifting
const parseDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

// Helper to format date object to YYYY-MM-DD
const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Check if a habit is scheduled on a specific day of week
const isHabitScheduledOn = (dayOfWeek, habit) => {
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly') return true; // Weekly habits are active all week
  if (habit.frequency === 'custom') {
    return habit.customDays.includes(dayOfWeek);
  }
  return false;
};

// GET /api/dashboard - Get today's habits, completion percentage, and weekly summary
export const getDashboard = async (req, res) => {
  try {
    const todayStr = req.query.date || getTodayStr();
    const todayDate = parseDate(todayStr);
    const todayDayOfWeek = todayDate.getDay();

    // 1. Fetch all user habits
    const habits = await Habit.find({ userId: req.user._id });

    // 2. Filter habits scheduled for today
    const todayHabits = habits.filter(habit => isHabitScheduledOn(todayDayOfWeek, habit));

    // 3. Fetch checkins for today
    const checkInsToday = await CheckIn.find({
      userId: req.user._id,
      date: todayStr,
      status: 'done',
    });
    const checkInHabitIds = new Set(checkInsToday.map(ci => ci.habitId.toString()));

    // 4. Map check-in completion state to habits
    const todayHabitsWithStatus = todayHabits.map(habit => {
      const isCompleted = checkInHabitIds.has(habit._id.toString());
      return {
        ...habit.toObject(),
        isCompleted,
      };
    });

    // 5. Calculate today's completion percentage
    const totalToday = todayHabitsWithStatus.length;
    const completedToday = todayHabitsWithStatus.filter(h => h.isCompleted).length;
    const completionPercentage = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

    // 6. Generate optimized 7-day weekly completion summary
    const weeklySummary = [];
    const sevenDaysAgoDate = new Date(todayDate.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startDateStr = formatDate(sevenDaysAgoDate);

    // Query all done checkins for this user within the last 7 days in a single database roundtrip
    const checkInsWeek = await CheckIn.find({
      userId: req.user._id,
      date: { $gte: startDateStr, $lte: todayStr },
      status: 'done',
    });

    // Group checkins by date -> Set(habitIds)
    const checkInsByDate = {};
    checkInsWeek.forEach(ci => {
      if (!checkInsByDate[ci.date]) {
        checkInsByDate[ci.date] = new Set();
      }
      checkInsByDate[ci.date].add(ci.habitId.toString());
    });

    // Build the weekly summary daily records
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStr = formatDate(d);
      const dayOfWeek = d.getDay();
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g. "Mon"

      // Filter habits scheduled on this day
      const scheduledOnDay = habits.filter(habit => isHabitScheduledOn(dayOfWeek, habit));
      const doneSet = checkInsByDate[dayStr] || new Set();

      const total = scheduledOnDay.length;
      const completed = scheduledOnDay.filter(habit => doneSet.has(habit._id.toString())).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      weeklySummary.push({
        date: dayStr,
        dayName,
        dayOfWeek,
        total,
        completed,
        percentage,
      });
    }

    res.json({
      success: true,
      data: {
        todayStr,
        todayHabits: todayHabitsWithStatus,
        completionPercentage,
        weeklySummary,
      },
    });
  } catch (error) {
    console.error('getDashboard error:', error.message);
    res.status(500).json({ success: false, message: 'Server Error loading dashboard data' });
  }
};
