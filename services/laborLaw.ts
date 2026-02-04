
import { AttendanceRecord, RecordType, WorkSession, DailyReport } from '../types';

export const calculatePayrollFromRecords = (records: AttendanceRecord[]): DailyReport[] => {
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  
  const sessions: WorkSession[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].type === RecordType.IN) {
      const nextOut = sorted.slice(i + 1).find(r => r.type === RecordType.OUT);
      if (nextOut) {
        const duration = Math.floor((nextOut.timestamp - sorted[i].timestamp) / (1000 * 60));
        sessions.push({ 
          in: sorted[i], 
          out: nextOut, 
          durationMinutes: Math.max(0, duration),
          hourlyRate: sorted[i].snapshotHourlyRate,
          monthlySalary: sorted[i].snapshotMonthlySalary,
          salaryMode: sorted[i].snapshotSalaryMode
        });
        i = sorted.indexOf(nextOut, i);
      } else {
        sessions.push({ 
          in: sorted[i], 
          durationMinutes: 0,
          hourlyRate: sorted[i].snapshotHourlyRate,
          monthlySalary: sorted[i].snapshotMonthlySalary,
          salaryMode: sorted[i].snapshotSalaryMode
        });
      }
    }
  }

  const dailyGroups: Record<string, WorkSession[]> = {};
  sessions.forEach(s => {
    const date = new Date(s.in.timestamp).toLocaleDateString();
    if (!dailyGroups[date]) dailyGroups[date] = [];
    dailyGroups[date].push(s);
  });

  return Object.entries(dailyGroups).map(([date, daySessions]) => {
    const totalMinutes = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    
    // 使用該日第一筆簽到的薪資作為計算基準
    const firstSession = daySessions[0];
    const baseHourlyRate = firstSession.salaryMode === 'monthly' 
      ? Math.round(firstSession.monthlySalary / 30 / 8) 
      : firstSession.hourlyRate;

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

    const minuteRate = baseHourlyRate / 60;
    const pay = (regular * minuteRate) +
                (ot134 * minuteRate * 1.34) +
                (ot167 * minuteRate * 1.67);

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
