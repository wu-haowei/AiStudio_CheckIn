
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
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-sm border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white text-4xl shadow-xl shadow-indigo-200">⚡</div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">HR Master</h1>
            <p className="text-gray-400 text-sm font-medium">企業級自動化打卡系統</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input placeholder="帳號" className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-transparent" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} required />
            <input type="password" placeholder="密碼" className="w-full px-5 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-transparent" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required />
            {authError && <p className="text-red-500 text-xs text-center font-bold">{authError}</p>}
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">登入系統</button>
          </form>
          <p className="mt-8 text-center text-[10px] text-gray-300 uppercase tracking-widest font-bold">預設 Admin: admin / ADMIN</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex justify-between h-18 items-center py-4">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('clock')}>
            <span className="text-xl font-black text-indigo-600 tracking-tighter">HR Master</span>
          </div>
          <div className="flex space-x-1 sm:space-x-2">
            <button onClick={() => setView('clock')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'clock' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>打卡</button>
            <button onClick={() => setView('logs')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'logs' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>日誌</button>
            {user.role === UserRole.ADMIN && (
              <button onClick={() => setView('admin')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>管理中心</button>
            )}
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">🚪</button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 py-8">
        {view === 'clock' && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-indigo-200 font-bold text-xs mb-1 uppercase tracking-widest">個人狀態</p>
                <h2 className="text-3xl font-black mb-4">{user.name}</h2>
                <div className="flex space-x-4">
                  <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                    <p className="text-[10px] uppercase opacity-60">本月時數</p>
                    <p className="font-bold">{(myReports.reduce((s, r) => s + r.totalMinutes, 0)/60).toFixed(1)} h</p>
                  </div>
                  <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                    <p className="text-[10px] uppercase opacity-60">預估薪資</p>
                    <p className="font-bold">${myReports.reduce((s, r) => s + r.estimatedPay, 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 text-[140px] opacity-10 rotate-12">💼</div>
            </div>
            <ClockCard user={user} onUpdate={() => {}} />
          </div>
        )}

        {view === 'logs' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-black text-gray-800">個人考勤明細</h2>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr><th className="px-6 py-5">日期</th><th className="px-6 py-5">工時摘要</th><th className="px-6 py-5 text-right">當日估計</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {myReports.map(r => (
                    <tr key={r.date} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5 font-bold text-gray-800">{r.date}</td>
                      <td className="px-6 py-5">
                        <span className="text-gray-500 font-medium">{(r.totalMinutes / 60).toFixed(1)} 小時</span>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {r.sessions.map((s, i) => (
                            <span key={i} className="mr-2">
                              {new Date(s.in.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}-
                              {s.out ? new Date(s.out.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '...'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-black text-indigo-600 text-lg">${r.estimatedPay.toLocaleString()}</td>
                    </tr>
                  ))}
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
