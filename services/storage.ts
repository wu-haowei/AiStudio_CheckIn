
import { AttendanceRecord, User, UserRole } from '../types';

const KEYS = {
  ATTENDANCE: 'tw_hrms_v2_attendance',
  USERS: 'tw_hrms_v2_users',
  CURRENT_USER: 'tw_hrms_v2_current_user'
};

const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  username: 'admin',
  password: 'ADMIN',
  name: '系統管理員',
  role: UserRole.ADMIN,
  salaryMode: 'hourly',
  hourlyRate: 200,
  monthlySalary: 30000
};

export const StorageService = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(KEYS.USERS);
    if (!data) {
      const initialUsers = [DEFAULT_ADMIN];
      localStorage.setItem(KEYS.USERS, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return JSON.parse(data);
  },
  
  saveUsers: (users: User[]) => {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },

  addUser: (user: User) => {
    const users = StorageService.getUsers();
    users.push(user);
    StorageService.saveUsers(users);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
  },

  getAttendance: (userId?: string): AttendanceRecord[] => {
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    const records: AttendanceRecord[] = data ? JSON.parse(data) : [];
    return userId ? records.filter(r => r.userId === userId) : records;
  },

  addAttendance: (record: AttendanceRecord) => {
    const records = StorageService.getAttendance();
    records.push(record);
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(records));
  },

  clearAll: () => {
    localStorage.clear();
    window.location.reload();
  }
};
