const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export interface HabitData {
  title: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekly' | 'custom';
  customDays?: number[];
  reminderTime?: string | null;
}

export interface CheckIn {
  _id: string;
  habitId: string;
  userId: string;
  date: string;
  status: 'done' | 'missed';
}

export interface Habit extends HabitData {
  _id: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  checkIns?: CheckIn[];
  createdAt: string;
}

export interface DashboardDaySummary {
  date: string;
  dayName: string;
  dayOfWeek: number;
  total: number;
  completed: number;
  percentage: number;
}

export interface DashboardData {
  todayStr: string;
  todayHabits: (Habit & { isCompleted: boolean })[];
  completionPercentage: number;
  weeklySummary: DashboardDaySummary[];
}

export const api = {
  getDashboard: async (token: string, dateStr?: string): Promise<DashboardData> => {
    const url = new URL(`${API_BASE_URL}/dashboard`);
    if (dateStr) {
      url.searchParams.append('date', dateStr);
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getHeaders(token),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to fetch dashboard data');
    return result.data;
  },

  getHabits: async (token: string): Promise<Habit[]> => {
    const response = await fetch(`${API_BASE_URL}/habits`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to fetch habits');
    return result.data;
  },

  createHabit: async (token: string, data: HabitData): Promise<Habit> => {
    const response = await fetch(`${API_BASE_URL}/habits`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.errors?.[0]?.msg || result.message || 'Failed to create habit');
    return result.data;
  },

  updateHabit: async (token: string, id: string, data: HabitData): Promise<Habit> => {
    const response = await fetch(`${API_BASE_URL}/habits/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.errors?.[0]?.msg || result.message || 'Failed to update habit');
    return result.data;
  },

  deleteHabit: async (token: string, id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/habits/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to delete habit');
  },

  toggleCheckIn: async (
    token: string,
    id: string,
    date: string
  ): Promise<{ action: 'done' | 'undone'; data: Habit }> => {
    const response = await fetch(`${API_BASE_URL}/habits/${id}/checkin`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ date }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to toggle check-in');
    return {
      action: result.action,
      data: result.data,
    };
  },
};
