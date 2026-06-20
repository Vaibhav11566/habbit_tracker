import mongoose from 'mongoose';

const checkInSchema = new mongoose.Schema(
  {
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // 'YYYY-MM-DD' to avoid timezone shifts
      required: true,
    },
    status: {
      type: String,
      enum: ['done', 'missed'],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound unique index on habitId and date
checkInSchema.index({ habitId: 1, date: 1 }, { unique: true });

const CheckIn = mongoose.model('CheckIn', checkInSchema);
export default CheckIn;
