
import { AttendanceRecord, User, UserRole, RecordType } from '../types';

const KEYS = {
  ATTENDANCE: 'tw_hrms_v3_attendance',
  USERS: 'tw_hrms_v3_users',
  CURRENT_USER: 'tw_hrms_v3_current_user'
};

const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  username: 'admin',
  password: 'ADMIN',
  name: '系統管理員',
  role: UserRole.ADMIN,
  salaryMode: 'hourly',
  hourlyRate: 200,
  monthlySalary: 0
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
  
  updateUser: (updatedUser: User) => {
    const users = StorageService.getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      // 如果更新的是當前登入者
      const current = StorageService.getCurrentUser();
      if (current && current.id === updatedUser.id) {
        StorageService.setCurrentUser(updatedUser);
      }
    }
  },

  addUser: (user: User) => {
    const users = StorageService.getUsers();
    users.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
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
