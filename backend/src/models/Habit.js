import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'custom'],
      required: true,
    },
    customDays: {
      type: [Number], // 0-6 for Sun-Sat
      default: [],
    },
    reminderTime: {
      type: String, // "HH:MM" e.g., "08:30"
      default: null,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Habit = mongoose.model('Habit', habitSchema);
export default Habit;
