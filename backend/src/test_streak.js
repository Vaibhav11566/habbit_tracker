import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Habit from './models/Habit.js';
import CheckIn from './models/CheckIn.js';
import { recalculateStreaks } from './utils/streak.js';

dotenv.config();

const runTests = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/habit_tracker';
    await mongoose.connect(mongoUri);
    console.log('Test runner connected to database.');

    // 1. Setup clean test user
    await User.deleteMany({ firebaseUid: 'test-user-uid' });
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      firebaseUid: 'test-user-uid',
    });
    console.log('Test user created.');

    // Helper to cleanup habits/checkins for the test user
    const cleanup = async () => {
      const habits = await Habit.find({ userId: user._id });
      const habitIds = habits.map(h => h._id);
      await CheckIn.deleteMany({ habitId: { $in: habitIds } });
      await Habit.deleteMany({ userId: user._id });
    };
    await cleanup();

    // ==========================================
    // TEST 1: Daily Habit Streak
    // ==========================================
    console.log('\n--- Running Test 1: Daily Habit ---');
    const dailyHabit = await Habit.create({
      userId: user._id,
      title: 'Drink Water',
      icon: 'water',
      color: 'blue',
      frequency: 'daily',
    });

    // Add check-ins for 3 consecutive days
    await CheckIn.create([
      { habitId: dailyHabit._id, userId: user._id, date: '2026-06-15', status: 'done' },
      { habitId: dailyHabit._id, userId: user._id, date: '2026-06-16', status: 'done' },
      { habitId: dailyHabit._id, userId: user._id, date: '2026-06-17', status: 'done' },
    ]);

    let updated = await recalculateStreaks(dailyHabit, '2026-06-17');
    console.log(`Consecutive 3 days: Current=${updated.currentStreak} (expected 3), Longest=${updated.longestStreak} (expected 3)`);
    if (updated.currentStreak !== 3 || updated.longestStreak !== 3) throw new Error('Daily test 1 failed');

    // Add a check-in skipping a day (skipping June 18, checkin June 19)
    await CheckIn.create({ habitId: dailyHabit._id, userId: user._id, date: '2026-06-19', status: 'done' });
    updated = await recalculateStreaks(dailyHabit, '2026-06-19');
    console.log(`With skip (skipped 18, checkin 19): Current=${updated.currentStreak} (expected 1), Longest=${updated.longestStreak} (expected 3)`);
    if (updated.currentStreak !== 1 || updated.longestStreak !== 3) throw new Error('Daily test 2 failed');

    // ==========================================
    // TEST 2: Custom Habit Streak (Mon, Wed, Fri - 1, 3, 5)
    // ==========================================
    console.log('\n--- Running Test 2: Custom Habit (Mon, Wed, Fri) ---');
    const customHabit = await Habit.create({
      userId: user._id,
      title: 'Gym',
      icon: 'gym',
      color: 'red',
      frequency: 'custom',
      customDays: [1, 3, 5], // Mon, Wed, Fri
    });

    // Checkin June 15 (Mon) and June 17 (Wed). June 16 (Tue) is not scheduled, so streak should continue!
    await CheckIn.create([
      { habitId: customHabit._id, userId: user._id, date: '2026-06-15', status: 'done' },
      { habitId: customHabit._id, userId: user._id, date: '2026-06-17', status: 'done' },
    ]);

    updated = await recalculateStreaks(customHabit, '2026-06-17');
    console.log(`Mon + Wed (Tue skipped, non-scheduled): Current=${updated.currentStreak} (expected 2), Longest=${updated.longestStreak} (expected 2)`);
    if (updated.currentStreak !== 2 || updated.longestStreak !== 2) throw new Error('Custom test 1 failed');

    // Skip June 19 (Fri - scheduled day) and checkin June 22 (Mon - scheduled day)
    await CheckIn.create({ habitId: customHabit._id, userId: user._id, date: '2026-06-22', status: 'done' });
    updated = await recalculateStreaks(customHabit, '2026-06-22');
    console.log(`Skip Fri, checkin Mon: Current=${updated.currentStreak} (expected 1), Longest=${updated.longestStreak} (expected 2)`);
    if (updated.currentStreak !== 1 || updated.longestStreak !== 2) throw new Error('Custom test 2 failed');

    // ==========================================
    // TEST 3: Weekly Habit Streak
    // ==========================================
    console.log('\n--- Running Test 3: Weekly Habit ---');
    const weeklyHabit = await Habit.create({
      userId: user._id,
      title: 'Clean House',
      icon: 'broom',
      color: 'green',
      frequency: 'weekly',
    });

    // Checkin on Monday of Week 1 (June 8) and Thursday of Week 2 (June 18)
    await CheckIn.create([
      { habitId: weeklyHabit._id, userId: user._id, date: '2026-06-08', status: 'done' }, // Week 1 (starts June 7)
      { habitId: weeklyHabit._id, userId: user._id, date: '2026-06-18', status: 'done' }, // Week 2 (starts June 14)
    ]);

    updated = await recalculateStreaks(weeklyHabit, '2026-06-18');
    console.log(`Week 1 + Week 2 check-ins: Current=${updated.currentStreak} (expected 2), Longest=${updated.longestStreak} (expected 2)`);
    if (updated.currentStreak !== 2 || updated.longestStreak !== 2) throw new Error('Weekly test 1 failed');

    // Evaluate in Week 3 (starts June 21) before checking in: the streak should still be alive (expected 2) because we have until the end of the week.
    updated = await recalculateStreaks(weeklyHabit, '2026-06-25');
    console.log(`Evaluating in Week 3 (no checkin yet): Current=${updated.currentStreak} (expected 2), Longest=${updated.longestStreak} (expected 2)`);
    if (updated.currentStreak !== 2 || updated.longestStreak !== 2) throw new Error('Weekly test 2 failed');

    // Evaluate in Week 4 (starts June 28) without checking in Week 3: streak should now be broken (expected 0)
    updated = await recalculateStreaks(weeklyHabit, '2026-07-02');
    console.log(`Evaluating in Week 4 (missed Week 3): Current=${updated.currentStreak} (expected 0), Longest=${updated.longestStreak} (expected 2)`);
    if (updated.currentStreak !== 0 || updated.longestStreak !== 2) throw new Error('Weekly test 3 failed');

    console.log('\n==========================================');
    console.log('ALL STREAK TESTS PASSED SUCCESSFULLY! ✅');
    console.log('==========================================');

    await cleanup();
    await User.deleteOne({ _id: user._id });
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    try {
      await mongoose.connection.close();
    } catch (_) {}
    process.exit(1);
  }
};

runTests();
