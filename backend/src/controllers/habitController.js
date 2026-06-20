import { validationResult } from 'express-validator';
import Habit from '../models/Habit.js';
import CheckIn from '../models/CheckIn.js';
import { recalculateStreaks, getTodayStr } from '../utils/streak.js';

// GET /api/habits - Fetch all habits with their check-ins
export const getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user._id }).sort({ createdAt: -1 });

    // Fetch all check-ins for these habits to return nested check-in history
    const habitsWithCheckIns = await Promise.all(
      habits.map(async (habit) => {
        const checkIns = await CheckIn.find({ habitId: habit._id }).sort({ date: 1 });
        return {
          ...habit.toObject(),
          checkIns,
        };
      })
    );

    res.json({ success: true, count: habitsWithCheckIns.length, data: habitsWithCheckIns });
  } catch (error) {
    console.error('getHabits error:', error.message);
    res.status(500).json({ success: false, message: 'Server Error fetching habits' });
  }
};

// POST /api/habits - Create a new habit
export const createHabit = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { title, icon, color, frequency, customDays, reminderTime } = req.body;

  try {
    const habit = await Habit.create({
      userId: req.user._id,
      title,
      icon,
      color,
      frequency,
      customDays: frequency === 'custom' ? customDays : [],
      reminderTime: reminderTime || null,
      currentStreak: 0,
      longestStreak: 0,
    });

    res.status(201).json({ success: true, data: habit });
  } catch (error) {
    console.error('createHabit error:', error.message);
    res.status(500).json({ success: false, message: 'Server Error creating habit' });
  }
};

// PUT /api/habits/:id - Update an existing habit
export const updateHabit = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { title, icon, color, frequency, customDays, reminderTime } = req.body;

  try {
    let habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });

    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    habit.title = title || habit.title;
    habit.icon = icon || habit.icon;
    habit.color = color || habit.color;
    habit.frequency = frequency || habit.frequency;
    habit.customDays = frequency === 'custom' ? customDays : (frequency ? [] : habit.customDays);
    habit.reminderTime = reminderTime !== undefined ? reminderTime : habit.reminderTime;

    await habit.save();

    // Recalculate streak in case frequency or customDays changed
    await recalculateStreaks(habit, getTodayStr());

    // Fetch check-ins to return complete object
    const checkIns = await CheckIn.find({ habitId: habit._id }).sort({ date: 1 });

    res.json({
      success: true,
      data: {
        ...habit.toObject(),
        checkIns,
      },
    });
  } catch (error) {
    console.error('updateHabit error:', error.message);
    res.status(500).json({ success: false, message: 'Server Error updating habit' });
  }
};

// DELETE /api/habits/:id - Delete a habit and its check-ins
export const deleteHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });

    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    // Delete all check-ins for this habit
    await CheckIn.deleteMany({ habitId: habit._id });
    // Delete the habit itself
    await Habit.deleteOne({ _id: habit._id });

    res.json({ success: true, message: 'Habit and associated check-ins deleted' });
  } catch (error) {
    console.error('deleteHabit error:', error.message);
    res.status(500).json({ success: false, message: 'Server Error deleting habit' });
  }
};

// POST /api/habits/:id/checkin - Toggle check-in status (done/undo)
export const toggleCheckIn = async (req, res) => {
  const { date } = req.body;
  if (!date) {
    return res.status(400).json({ success: false, message: 'Date is required in YYYY-MM-DD format' });
  }

  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });

    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    const existingCheckIn = await CheckIn.findOne({
      habitId: habit._id,
      date,
    });

    let actionTaken = '';

    if (existingCheckIn) {
      if (existingCheckIn.status === 'done') {
        // Toggle OFF (Undo check-in) -> Delete CheckIn
        await CheckIn.deleteOne({ _id: existingCheckIn._id });
        actionTaken = 'undone';
      } else {
        // Toggle ON
        existingCheckIn.status = 'done';
        await existingCheckIn.save();
        actionTaken = 'done';
      }
    } else {
      // Create new done check-in
      await CheckIn.create({
        habitId: habit._id,
        userId: req.user._id,
        date,
        status: 'done',
      });
      actionTaken = 'done';
    }

    // Recalculate streaks chronologically for the habit
    const updatedHabit = await recalculateStreaks(habit, date);

    // Fetch updated list of check-ins
    const checkIns = await CheckIn.find({ habitId: habit._id }).sort({ date: 1 });

    res.json({
      success: true,
      action: actionTaken,
      data: {
        ...updatedHabit.toObject(),
        checkIns,
      },
    });
  } catch (error) {
    console.error('toggleCheckIn error:', error.message);
    res.status(500).json({ success: false, message: 'Server Error toggling check-in' });
  }
};
