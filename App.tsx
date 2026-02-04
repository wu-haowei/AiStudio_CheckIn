
import React, { useState, useMemo } from 'react';
import { StorageService } from './services/storage';
import { User, UserRole, RecordType } from './types';
import ClockCard from './components/ClockCard';
import AdminPanel from './components/AdminPanel';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(StorageService.getCurrentUser());
  const [view, setView] = useState<'clock' | 'logs' | 'admin'>('clock');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  const attendance = useMemo(() => user ? StorageService.getAttendance(user.id) : [], [user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const allUsers = StorageService.getUsers();
    const found = allUsers.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (found) {
      StorageService.setCurrentUser(found);
      setUser(found);
      setAuthError('');
    } else {
      setAuthError('帳號或密碼錯誤');
    }
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setUser(null);
    setView('clock');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-3xl shadow-lg">💼</div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">HR Master</h1>
            <p className="text-gray-400 text-sm font-medium">企業打卡管理系統</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              placeholder="使用者帳號" 
              className="w-full px-5 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-transparent"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
              required
            />
            <input 
              type="password" 
              placeholder="登入密碼" 
              className="w-full px-5 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-transparent"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              required
            />
            {authError && <p className="text-red-500 text-xs text-center font-bold">{authError}</p>}
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
              登入系統
            </button>
          </form>
          <p className="mt-8 text-center text-xs text-gray-300">Default Admin: admin / ADMIN</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <span className="text-lg font-black text-indigo-600">HR Master</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 uppercase tracking-widest">{user.role}</span>
          </div>
          <div className="flex space-x-1">
            <button onClick={() => setView('clock')} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${view === 'clock' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}>打卡</button>
            <button onClick={() => setView('logs')} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${view === 'logs' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}>紀錄</button>
            {user.role === UserRole.ADMIN && (
              <button onClick={() => setView('admin')} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${view === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}>管理</button>
            )}
            <button onClick={handleLogout} className="px-3 py-1.5 text-gray-400 hover:text-red-500">🚪</button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 py-8">
        {view === 'clock' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-indigo-200 font-bold text-sm mb-1 uppercase tracking-widest">Welcome back</p>
                <h2 className="text-3xl font-black">{user.name}</h2>
                <p className="text-indigo-100 text-xs mt-2 opacity-80">{user.salaryMode === 'monthly' ? `月薪制: $${user.monthlySalary}` : `時薪制: $${user.hourlyRate}`}</p>
              </div>
              <div className="absolute -right-10 -bottom-10 text-[160px] opacity-10 leading-none">💼</div>
            </div>
            <ClockCard user={user} onUpdate={() => {}} />
          </div>
        )}

        {view === 'logs' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">個人打卡 Log</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">時間</th>
                    <th className="px-6 py-4">類型</th>
                    <th className="px-6 py-4">地理位置</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...attendance].sort((a,b) => b.timestamp - a.timestamp).map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${log.type === RecordType.IN ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 italic">
                        {log.location ? `${log.location.lat.toFixed(4)}, ${log.location.lng.toFixed(4)}` : '無定位'}
                      </td>
                    </tr>
                  ))}
                  {attendance.length === 0 && <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400">尚無打卡紀錄</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
};

export default App;
