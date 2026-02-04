
export enum RecordType {
  IN = '簽到',
  OUT = '簽退'
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export enum AuditAction {
  CREATE_USER = '建立員工',
  UPDATE_USER = '更新員工',
  BATCH_IMPORT = '批量匯入',
  MANUAL_CLOCK = '補登打卡'
}

export interface AuditLog {
  id: string;
  timestamp: number;
  operatorId: string;
  operatorName: string;
  targetId?: string;
  targetName?: string;
  action: AuditAction;
  details: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  timestamp: number;
  type: RecordType;
  location?: GeoLocation;
  // 快照薪資，確保不溯及既往
  snapshotSalaryMode: 'hourly' | 'monthly';
  snapshotHourlyRate: number;
  snapshotMonthlySalary: number;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  salaryMode: 'hourly' | 'monthly';
  hourlyRate: number;
  monthlySalary: number;
}

export interface WorkSession {
  in: AttendanceRecord;
  out?: AttendanceRecord;
  durationMinutes: number;
  hourlyRate: number;
  monthlySalary: number;
  salaryMode: 'hourly' | 'monthly';
}

export interface DailyReport {
  date: string;
  sessions: WorkSession[];
  totalMinutes: number;
  regularMinutes: number;
  ot134Minutes: number;
  ot167Minutes: number;
  estimatedPay: number;
}
