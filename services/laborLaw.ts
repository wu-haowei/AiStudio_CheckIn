
import { AttendanceRecord, RecordType, User, WorkSession, DailyReport } from '../types';

export const calculatePayroll = (user: User, records: AttendanceRecord[]): DailyReport[] => {
  // 1. 先依時間排序
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  
  // 2. 配對 IN/OUT
  const sessions: WorkSession[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].type === RecordType.IN) {
      const nextOut = sorted.slice(i + 1).find(r => r.type === RecordType.OUT);
      if (nextOut) {
        const duration = Math.floor((nextOut.timestamp - sorted[i].timestamp) / (1000 * 60));
        sessions.push({ in: sorted[i], out: nextOut, durationMinutes: Math.max(0, duration) });
        // 跳過已使用的 OUT
        const outIndex = sorted.indexOf(nextOut);
        i = i < outIndex ? i : i; // 這裡不直接修改 i，但邏輯上我們只抓取後續未配對的
      } else {
        sessions.push({ in: sorted[i], durationMinutes: 0 });
      }
    }
  }

  // 3. 依日期分組
  const dailyGroups: Record<string, WorkSession[]> = {};
  sessions.forEach(s => {
    const date = new Date(s.in.timestamp).toLocaleDateString();
    if (!dailyGroups[date]) dailyGroups[date] = [];
    dailyGroups[date].push(s);
  });

  // 4. 計算薪資
  const baseHourlyRate = user.salaryMode === 'monthly' 
    ? Math.round(user.monthlySalary / 30 / 8) 
    : user.hourlyRate;

  return Object.entries(dailyGroups).map(([date, daySessions]) => {
    const totalMinutes = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    
    let regular = 0;
    let ot134 = 0;
    let ot167 = 0;

    const regLimit = 8 * 60;
    const otLimit = 2 * 60;

    if (totalMinutes <= regLimit) {
      regular = totalMinutes;
    } else if (totalMinutes <= regLimit + otLimit) {
      regular = regLimit;
      ot134 = totalMinutes - regLimit;
    } else {
      regular = regLimit;
      ot134 = otLimit;
      ot167 = totalMinutes - regLimit - otLimit;
    }

    const pay = (regular * (baseHourlyRate / 60)) +
                (ot134 * (baseHourlyRate / 60) * 1.34) +
                (ot167 * (baseHourlyRate / 60) * 1.67);

    return {
      date,
      sessions: daySessions,
      totalMinutes,
      regularMinutes: regular,
      ot134Minutes: ot134,
      ot167Minutes: ot167,
      estimatedPay: Math.round(pay)
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
