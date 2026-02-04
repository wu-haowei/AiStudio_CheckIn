
import React, { useState, useMemo } from 'react';
import { StorageService } from '../services/storage';
import { calculatePayrollFromRecords } from '../services/laborLaw';
import { User, UserRole, AttendanceRecord } from '../types';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import saveAs from 'file-saver';

const AdminPanel: React.FC = () => {
  const users = StorageService.getUsers();
  const allAttendance = StorageService.getAttendance();
  
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'export'>('logs');
  const [filter, setFilter] = useState({ userId: 'all', startDate: '', endDate: '' });
  const [exportConfig, setExportConfig] = useState({ year: new Date().getFullYear(), month: 'all' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);

  // 紀錄篩選邏輯
  const filteredRecords = useMemo(() => {
    return allAttendance.filter(r => {
      const matchUser = filter.userId === 'all' || r.userId === filter.userId;
      const rDate = new Date(r.timestamp).toISOString().split('T')[0];
      const matchStart = !filter.startDate || rDate >= filter.startDate;
      const matchEnd = !filter.endDate || rDate <= filter.endDate;
      return matchUser && matchStart && matchEnd;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [allAttendance, filter]);

  // 匯出報表邏輯
  const handleExport = async () => {
    const zip = new JSZip();
    const monthsToExport = exportConfig.month === 'all' 
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : [parseInt(exportConfig.month)];

    let totalWorkbooksGenerated = 0;

    for (const m of monthsToExport) {
      const workbook = XLSX.utils.book_new();
      let hasDataForMonth = false;
      const monthStr = `${exportConfig.year}-${String(m).padStart(2, '0')}`;

      users.forEach(u => {
        const uRecords = allAttendance.filter(r => {
          const d = new Date(r.timestamp);
          return r.userId === u.id && d.getFullYear() === exportConfig.year && (d.getMonth() + 1) === m;
        });

        if (uRecords.length > 0) {
          const reports = calculatePayrollFromRecords(uRecords);
          const sheetData = reports.map(r => ({
            '日期': r.date,
            '總工時(hr)': (r.totalMinutes / 60).toFixed(2),
            '平日工時': (r.regularMinutes / 60).toFixed(2),
            '加班1.34': (r.ot134Minutes / 60).toFixed(2),
            '加班1.67': (r.ot167Minutes / 60).toFixed(2),
            '估計薪資': r.estimatedPay
          }));
          const ws = XLSX.utils.json_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(workbook, ws, u.name.substring(0, 31));
          hasDataForMonth = true;
        }
      });

      if (hasDataForMonth) {
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        zip.file(`出勤報表_${monthStr}.xlsx`, excelBuffer);
        totalWorkbooksGenerated++;
      }
    }

    if (totalWorkbooksGenerated > 1) {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `年度出勤報表_${exportConfig.year}.zip`);
    } else if (totalWorkbooksGenerated === 1) {
      const firstMonthFile = Object.keys(zip.files)[0];
      const content = await zip.files[firstMonthFile].async('blob');
      saveAs(content, firstMonthFile);
    } else {
      alert('該查詢範圍內無任何打卡數據');
    }
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      StorageService.updateUser(editingUser);
      setEditingUser(null);
      alert('員工資料已更新');
    }
  };

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const mode = fd.get('salaryMode') as 'hourly' | 'monthly';
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: fd.get('username') as string,
      password: fd.get('password') as string || '123456',
      name: fd.get('name') as string,
      role: UserRole.USER,
      salaryMode: mode,
      hourlyRate: mode === 'hourly' ? Number(fd.get('rate')) : 0,
      monthlySalary: mode === 'monthly' ? Number(fd.get('rate')) : 0,
    };
    StorageService.addUser(newUser);
    setShowAddUser(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-800">管理主控台</h2>
          <p className="text-gray-400 text-sm">全方位人力資源管理</p>
        </div>
      </div>

      {/* 子分頁導覽 */}
      <div className="flex bg-gray-100 p-1 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('logs')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>打卡日誌</button>
        <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>人員管理</button>
        <button onClick={() => setActiveTab('export')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'export' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>報表匯出</button>
      </div>

      {activeTab === 'logs' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* 篩選器 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">員工</label>
              <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm" value={filter.userId} onChange={e => setFilter({...filter, userId: e.target.value})}>
                <option value="all">全體員工</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">開始日期</label>
              <input type="date" className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">結束日期</label>
              <input type="date" className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] tracking-wider uppercase">
                <tr><th className="px-6 py-4">員工</th><th className="px-6 py-4">時間</th><th className="px-6 py-4">動作</th><th className="px-6 py-4">費率快照</th><th className="px-6 py-4">位置</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRecords.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800">{users.find(u => u.id === r.userId)?.name || '未知'}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${r.type === '簽到' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{r.type}</span></td>
                    <td className="px-6 py-4 text-xs font-medium">{r.snapshotSalaryMode === 'monthly' ? `$${r.snapshotMonthlySalary}/月` : `$${r.snapshotHourlyRate}/時`}</td>
                    <td className="px-6 py-4 text-[10px] text-gray-400 font-mono">{r.location ? `${r.location.lat.toFixed(4)},${r.location.lng.toFixed(4)}` : '無定位'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-700">員工清單 ({users.length})</h3>
            <button onClick={() => setShowAddUser(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">+ 新增員工</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map(u => (
              <div key={u.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">{u.name} <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 ml-2">@{u.username}</span></p>
                  <p className="text-xs text-indigo-500 font-medium mt-1">
                    {u.salaryMode === 'monthly' ? `月薪 $${u.monthlySalary.toLocaleString()}` : `時薪 $${u.hourlyRate.toLocaleString()}`}
                  </p>
                </div>
                <button onClick={() => setEditingUser(u)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">✏️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 max-w-lg mx-auto text-center animate-in fade-in zoom-in-95">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-black mb-2">智慧報表中心</h3>
          <p className="text-gray-400 text-sm mb-8">選擇年份與月份，一鍵產生全體員工出勤 Excel。跨月份將自動壓縮為 ZIP 檔。</p>
          
          <div className="space-y-4 mb-8">
            <div className="text-left">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">選擇年份</label>
              <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold" value={exportConfig.year} onChange={e => setExportConfig({...exportConfig, year: parseInt(e.target.value)})}>
                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y} 年</option>)}
              </select>
            </div>
            <div className="text-left">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">選擇月份</label>
              <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold" value={exportConfig.month} onChange={e => setExportConfig({...exportConfig, month: e.target.value})}>
                <option value="all">整年度 (1-12月)</option>
                {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m} 月</option>)}
              </select>
            </div>
          </div>

          <button onClick={handleExport} className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-100 hover:bg-green-700 transition-all">
            立即產生報表
          </button>
        </div>
      )}

      {/* 編輯員工 Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl">
            <h3 className="text-xl font-black mb-6">編輯員工：{editingUser.name}</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} placeholder="姓名" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none" required />
              <div className="grid grid-cols-2 gap-2 p-3 bg-indigo-50 rounded-xl">
                <label className="flex items-center space-x-2"><input type="radio" checked={editingUser.salaryMode === 'hourly'} onChange={() => setEditingUser({...editingUser, salaryMode: 'hourly', monthlySalary: 0})} /> <span className="text-sm font-bold">時薪制</span></label>
                <label className="flex items-center space-x-2"><input type="radio" checked={editingUser.salaryMode === 'monthly'} onChange={() => setEditingUser({...editingUser, salaryMode: 'monthly', hourlyRate: 0})} /> <span className="text-sm font-bold">月薪制</span></label>
              </div>
              {editingUser.salaryMode === 'hourly' ? (
                <input type="number" value={editingUser.hourlyRate || ''} onChange={e => setEditingUser({...editingUser, hourlyRate: Number(e.target.value)})} placeholder="時薪額度" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none" required />
              ) : (
                <input type="number" value={editingUser.monthlySalary || ''} onChange={e => setEditingUser({...editingUser, monthlySalary: Number(e.target.value)})} placeholder="月薪額度" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none" required />
              )}
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 text-gray-400 font-bold">取消</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">儲存變更</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新增員工 Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl">
            <h3 className="text-xl font-black mb-6">建立新帳號</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <input name="name" placeholder="員工真實姓名" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none" required />
              <input name="username" placeholder="登入帳號" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none" required />
              <input name="password" type="password" placeholder="登入密碼 (預設 123456)" className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <select name="salaryMode" className="px-4 py-3 bg-gray-50 rounded-xl">
                  <option value="hourly">時薪制</option>
                  <option value="monthly">月薪制</option>
                </select>
                <input name="rate" type="number" placeholder="金額" className="px-4 py-3 bg-gray-50 rounded-xl outline-none" required />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-3 text-gray-400 font-bold">取消</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">建立員工</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
