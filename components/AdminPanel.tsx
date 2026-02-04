
import React, { useState, useMemo } from 'react';
import { StorageService } from '../services/storage';
import { calculatePayroll } from '../services/laborLaw';
import { User, UserRole } from '../types';

const AdminPanel: React.FC = () => {
  const users = StorageService.getUsers();
  const allAttendance = StorageService.getAttendance();
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id);
  const [showAddUser, setShowAddUser] = useState(false);

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);
  const userRecords = useMemo(() => allAttendance.filter(r => r.userId === selectedUserId), [allAttendance, selectedUserId]);
  const reports = useMemo(() => selectedUser ? calculatePayroll(selectedUser, userRecords) : [], [selectedUser, userRecords]);

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: fd.get('username') as string,
      password: fd.get('password') as string || '123456',
      name: fd.get('name') as string,
      role: UserRole.USER,
      salaryMode: fd.get('salaryMode') as 'hourly' | 'monthly',
      hourlyRate: Number(fd.get('hourlyRate')) || 0,
      monthlySalary: Number(fd.get('monthlySalary')) || 0,
    };
    StorageService.addUser(newUser);
    setShowAddUser(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">管理中心</h2>
        <button 
          onClick={() => setShowAddUser(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm"
        >
          + 新增員工帳號
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <label className="text-sm font-bold text-gray-500">選擇員工：</label>
        <select 
          className="flex-1 bg-gray-50 border-none rounded-lg px-4 py-2 text-sm outline-none"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}
        </select>
      </div>

      {selectedUser && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-4">薪資配置</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">計薪模式</span><span className="font-bold">{selectedUser.salaryMode === 'monthly' ? '月薪' : '時薪'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">數額</span><span className="font-bold text-indigo-600">NT$ {(selectedUser.salaryMode === 'monthly' ? selectedUser.monthlySalary : selectedUser.hourlyRate).toLocaleString()}</span></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-4">統計概況</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">總出勤天數</span><span className="font-bold">{reports.length} 天</span></div>
              <div className="flex justify-between"><span className="text-gray-500">本表預估薪資</span><span className="font-bold text-green-600">NT$ {reports.reduce((s, r) => s + r.estimatedPay, 0).toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-bold">
            <tr>
              <th className="px-6 py-4">日期</th>
              <th className="px-6 py-4">工時時段</th>
              <th className="px-6 py-4">總時數</th>
              <th className="px-6 py-4">薪資試算</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.map(r => (
              <tr key={r.date} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-bold">{r.date}</td>
                <td className="px-6 py-4">
                  {r.sessions.map((s, idx) => (
                    <div key={idx} className="text-xs text-gray-600">
                      {new Date(s.in.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} 
                      → {s.out ? new Date(s.out.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '未簽退'}
                    </div>
                  ))}
                </td>
                <td className="px-6 py-4 font-medium">{(r.totalMinutes / 60).toFixed(1)} hr</td>
                <td className="px-6 py-4 font-bold text-indigo-600">$ {r.estimatedPay.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl">
            <h3 className="text-xl font-bold mb-6">新增員工</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <input name="name" placeholder="員工姓名" className="w-full px-4 py-2 bg-gray-50 rounded-lg outline-none" required />
              <input name="username" placeholder="登入帳號" className="w-full px-4 py-2 bg-gray-50 rounded-lg outline-none" required />
              <input name="password" type="password" placeholder="登入密碼 (預設 123456)" className="w-full px-4 py-2 bg-gray-50 rounded-lg outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <select name="salaryMode" className="px-4 py-2 bg-gray-50 rounded-lg outline-none">
                  <option value="hourly">時薪制</option>
                  <option value="monthly">月薪制</option>
                </select>
                <input name="hourlyRate" type="number" placeholder="時薪額度" className="px-4 py-2 bg-gray-50 rounded-lg outline-none" />
                <input name="monthlySalary" type="number" placeholder="月薪額度" className="px-4 py-2 bg-gray-50 rounded-lg outline-none col-span-2" />
              </div>
              <div className="flex space-x-2 pt-4">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-2 text-gray-500 font-bold">取消</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg">確認建立</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
