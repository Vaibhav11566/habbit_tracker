import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middlewares/auth.js';
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  toggleCheckIn,
} from '../controllers/habitController.js';

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

router.route('/')
  .get(getHabits)
  .post(
    [
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('icon').trim().notEmpty().withMessage('Icon is required'),
      body('color').trim().notEmpty().withMessage('Color is required'),
      body('frequency').isIn(['daily', 'weekly', 'custom']).withMessage('Frequency must be daily, weekly, or custom'),
      body('customDays')
        .optional()
        .isArray()
        .custom((days, { req }) => {
          if (req.body.frequency === 'custom' && (!days || !Array.isArray(days) || days.length === 0)) {
            throw new Error('customDays is required and cannot be empty when frequency is custom');
          }
          if (days && days.some(d => d < 0 || d > 6)) {
            throw new Error('customDays must only contain numbers between 0 (Sunday) and 6 (Saturday)');
          }
          return true;
        }),
      body('reminderTime')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('reminderTime must be in HH:MM 24-hour format'),
    ],
    createHabit
  );

router.route('/:id')
  .put(
    [
      body('title').optional().trim().notEmpty().withMessage('Title cannot be empty if provided'),
      body('icon').optional().trim().notEmpty().withMessage('Icon cannot be empty if provided'),
      body('color').optional().trim().notEmpty().withMessage('Color cannot be empty if provided'),
      body('frequency').optional().isIn(['daily', 'weekly', 'custom']).withMessage('Frequency must be daily, weekly, or custom'),
      body('customDays')
        .optional()
        .isArray()
        .custom((days, { req }) => {
          if (req.body.frequency === 'custom' && (!days || !Array.isArray(days) || days.length === 0)) {
            throw new Error('customDays is required when frequency is custom');
          }
          if (days && days.some(d => d < 0 || d > 6)) {
            throw new Error('customDays must only contain numbers between 0 and 6');
          }
          return true;
        }),
      body('reminderTime')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('reminderTime must be in HH:MM 24-hour format'),
    ],
    updateHabit
  )
  .delete(deleteHabit);

router.post('/:id/checkin', toggleCheckIn);

export default router;
