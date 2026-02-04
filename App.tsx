
import React, { useState, useMemo, useEffect } from 'react';
import { StorageService } from './services/storage';
import { User, UserRole, RecordType } from './types';
import ClockCard from './components/ClockCard';
import AdminPanel from './components/AdminPanel';
import { calculatePayrollFromRecords } from './services/laborLaw';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(StorageService.getCurrentUser());
  const [view, setView] = useState<'clock' | 'logs' | 'admin'>('clock');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  const attendance = useMemo(() => user ? StorageService.getAttendance(user.id) : [], [user]);
  const myReports = useMemo(() => calculatePayrollFromRecords(attendance), [attendance]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const allUsers = StorageService.getUsers();
    const found = allUsers.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (found) {
      StorageService.setCurrentUser(found);
      setUser(found);
      setAuthError('');
      setView('clock');
    } else {
      setAuthError('帳號或密碼錯誤');
    }
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setUser(null);
    setLoginForm({ username: '', password: '' });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-2xl sm:rounded-3xl mx-auto mb-4 flex items-center justify-center text-white text-3xl sm:text-4xl shadow-xl shadow-indigo-200">⚡</div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">HR Master</h1>
            <p className="text-gray-400 text-xs sm:text-sm font-medium">企業級自動化打卡系統</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input placeholder="帳號" className="w-full px-5 py-3 sm:py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-transparent text-sm sm:text-base" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} required />
            <input type="password" placeholder="密碼" className="w-full px-5 py-3 sm:py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-transparent text-sm sm:text-base" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
            {authError && <p className="text-red-500 text-xs text-center font-bold">{authError}</p>}
            <button type="submit" className="w-full py-3 sm:py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all text-sm sm:text-base">登入系統</button>
          </form>
          <p className="mt-8 text-center text-[10px] text-gray-300 uppercase tracking-widest font-bold">預設 Admin: admin / ADMIN</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 shadow-sm px-4">
        <div className="max-w-6xl mx-auto flex justify-between h-16 sm:h-20 items-center">
          <div className="flex items-center space-x-2 cursor-pointer shrink-0" onClick={() => setView('clock')}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-lg">H</div>
            <span className="text-lg font-black text-indigo-600 tracking-tighter hidden xs:block">HR Master</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-3 overflow-x-auto no-scrollbar py-1">
            <button onClick={() => setView('clock')} className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${view === 'clock' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-100'}`}>打卡</button>
            <button onClick={() => setView('logs')} className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${view === 'logs' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-100'}`}>個人日誌</button>
            {user.role === UserRole.ADMIN && (
              <button onClick={() => setView('admin')} className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${view === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-100'}`}>管理中心</button>
            )}
            <div className="w-px h-4 bg-gray-200 mx-1"></div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0">🚪</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {view === 'clock' && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-indigo-200 font-bold text-[10px] sm:text-xs mb-1 uppercase tracking-widest">目前登入</p>
                <h2 className="text-2xl sm:text-3xl font-black mb-4 truncate">{user.name}</h2>
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-sm">
                    <p className="text-[10px] uppercase opacity-60">本月累計</p>
                    <p className="text-sm sm:text-base font-bold">{(myReports.reduce((s, r) => s + r.totalMinutes, 0)/60).toFixed(1)} h</p>
                  </div>
                  <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-sm">
                    <p className="text-[10px] uppercase opacity-60">預計應發薪資</p>
                    <p className="text-sm sm:text-base font-bold">${myReports.reduce((s, r) => s + r.estimatedPay, 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 text-[120px] sm:text-[140px] opacity-10 rotate-12 select-none pointer-events-none">💼</div>
            </div>
            <ClockCard user={user} onUpdate={() => {}} />
          </div>
        )}

        {view === 'logs' && (
          <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="flex items-end justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-gray-800">個人考勤明細</h2>
            </div>
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs sm:text-sm min-w-[500px]">
                <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr><th className="px-4 sm:px-6 py-4 sm:py-5">日期</th><th className="px-4 sm:px-6 py-4 sm:py-5">打卡區間</th><th className="px-4 sm:px-6 py-4 sm:py-5">總時數</th><th className="px-4 sm:px-6 py-4 sm:py-5 text-right">預估薪資</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {myReports.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">尚未有打卡資料</td></tr>
                  ) : (
                    myReports.map(r => (
                      <tr key={r.date} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 sm:py-5 font-bold text-gray-800">{r.date}</td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5">
                          <div className="flex flex-wrap gap-1">
                            {r.sessions.map((s, i) => (
                              <span key={i} className="bg-gray-100 text-[10px] px-1.5 py-0.5 rounded-md text-gray-500 whitespace-nowrap">
                                {new Date(s.in.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}-
                                {s.out ? new Date(s.out.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '...'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 text-gray-500 font-medium">{(r.totalMinutes / 60).toFixed(1)} h</td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 text-right font-black text-indigo-600 text-base sm:text-lg">${r.estimatedPay.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'admin' && user.role === UserRole.ADMIN && <AdminPanel />}
      </main>
    </div>
  );
};

export default App;
