
import React, { useState, useMemo } from 'react';
import { StorageService } from '../services/storage';
import { calculatePayrollFromRecords } from '../services/laborLaw';
import { User, UserRole, AttendanceRecord, RecordType, AuditLog, AuditAction } from '../types';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface ImportPreviewUser extends Partial<User> {
  error?: string;
  status: 'pending' | 'valid' | 'invalid';
}

const AdminPanel: React.FC = () => {
  const users = StorageService.getUsers();
  const allAttendance = StorageService.getAttendance();
  const currentUser = StorageService.getCurrentUser();
  const auditLogs = StorageService.getAuditLogs();
  
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'export' | 'audit'>('logs');
  const [filter, setFilter] = useState({ userId: 'all', startDate: '', endDate: '' });
  const [exportConfig, setExportConfig] = useState({ year: new Date().getFullYear(), month: 'all' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewUser[]>([]);

  // 稽核日誌篩選狀態
  const [auditSearch, setAuditSearch] = useState('');
  const [auditTargetFilter, setAuditTargetFilter] = useState('all');

  const [manualEntry, setManualEntry] = useState({
    userId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    type: RecordType.IN
  });

  const filteredRecords = useMemo(() => {
    return allAttendance.filter(r => {
      const matchUser = filter.userId === 'all' || r.userId === filter.userId;
      const rDate = new Date(r.timestamp).toISOString().split('T')[0];
      const matchStart = !filter.startDate || rDate >= filter.startDate;
      const matchEnd = !filter.endDate || rDate <= filter.endDate;
      return matchUser && matchStart && matchEnd;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [allAttendance, filter]);

  // 稽核日誌過濾邏輯
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchTarget = auditTargetFilter === 'all' || log.targetId === auditTargetFilter;
      const matchText = !auditSearch || 
        log.details.toLowerCase().includes(auditSearch.toLowerCase()) || 
        log.operatorName.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.action.toLowerCase().includes(auditSearch.toLowerCase());
      return matchTarget && matchText;
    });
  }, [auditLogs, auditSearch, auditTargetFilter]);

  const addAudit = (action: AuditAction, details: string, target?: User) => {
    if (!currentUser) return;
    const log: AuditLog = {
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      targetId: target?.id,
      targetName: target?.name,
      action,
      details
    };
    StorageService.addAuditLog(log);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find(u => u.id === manualEntry.userId);
    if (!targetUser) return alert('請選擇員工');

    const timestamp = new Date(`${manualEntry.date}T${manualEntry.time}`).getTime();
    const newRecord: AttendanceRecord = {
      id: 'manual-' + Math.random().toString(36).substr(2, 9),
      userId: targetUser.id,
      timestamp,
      type: manualEntry.type,
      snapshotSalaryMode: targetUser.salaryMode,
      snapshotHourlyRate: targetUser.hourlyRate,
      snapshotMonthlySalary: targetUser.monthlySalary
    };

    StorageService.addAttendance(newRecord);
    addAudit(AuditAction.MANUAL_CLOCK, `補登打卡: ${manualEntry.type} @ ${manualEntry.date} ${manualEntry.time}`, targetUser);
    setShowManualAdd(false);
    window.location.reload(); 
  };

  const handleExport = async () => {
    const zip = new JSZip();
    const months = exportConfig.month === 'all' ? Array.from({ length: 12 }, (_, i) => i + 1) : [parseInt(exportConfig.month)];
    let filesCount = 0;

    for (const m of months) {
      const workbook = XLSX.utils.book_new();
      let hasData = false;
      users.forEach(u => {
        const uRecords = allAttendance.filter(r => {
          const d = new Date(r.timestamp);
          return r.userId === u.id && d.getFullYear() === exportConfig.year && (d.getMonth() + 1) === m;
        });
        if (uRecords.length > 0) {
          const reports = calculatePayrollFromRecords(uRecords);
          const ws = XLSX.utils.json_to_sheet(reports.map(r => ({
            '日期': r.date, '總工時(hr)': (r.totalMinutes / 60).toFixed(2), '平日工時': (r.regularMinutes / 60).toFixed(2),
            '加班1.34': (r.ot134Minutes / 60).toFixed(2), '加班1.67': (r.ot167Minutes / 60).toFixed(2), '估計薪資': r.estimatedPay
          })));
          XLSX.utils.book_append_sheet(workbook, ws, u.name.substring(0, 31));
          hasData = true;
        }
      });
      if (hasData) {
        const buf = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        zip.file(`報表_${exportConfig.year}-${m}.xlsx`, buf);
        filesCount++;
      }
    }
    if (filesCount > 1) saveAs(await zip.generateAsync({ type: 'blob' }), `年度報表_${exportConfig.year}.zip`);
    else if (filesCount === 1) saveAs(await zip.files[Object.keys(zip.files)[0]].async('blob'), Object.keys(zip.files)[0]);
    else alert('無資料');
  };

  const handleDownloadTemplate = () => {
    const data = [
      ['姓名', '登入帳號', '密碼', '計薪模式(hourly/monthly)', '金額'],
      ['王小明', 'xiaoming', '123456', 'hourly', '200'],
      ['李大華', 'dahwa', '123456', 'monthly', '35000']
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf]), '員工匯入範本.xlsx');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      const validated: ImportPreviewUser[] = data.map((row: any) => {
        const name = row['姓名']?.toString().trim();
        const username = row['登入帳號']?.toString().trim();
        const password = row['密碼']?.toString().trim() || '123456';
        const mode = row['計薪模式(hourly/monthly)']?.toString().trim().toLowerCase();
        const rate = parseFloat(row['金額']);

        let error = '';
        if (!name) error = '姓名必填';
        else if (!username) error = '帳號必填';
        else if (users.some(u => u.username === username)) error = '帳號重複';
        else if (mode !== 'hourly' && mode !== 'monthly') error = '模式錯誤(hourly/monthly)';
        else if (isNaN(rate) || rate <= 0) error = '金額必須大於0';

        return { name, username, password, salaryMode: mode as 'hourly' | 'monthly', hourlyRate: mode === 'hourly' ? rate : 0, monthlySalary: mode === 'monthly' ? rate : 0, role: UserRole.USER, status: error ? 'invalid' : 'valid', error };
      });
      setImportPreview(validated);
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = () => {
    const validOnes = importPreview.filter(p => p.status === 'valid');
    if (validOnes.length === 0) return alert('無有效資料可匯入');
    validOnes.forEach(p => {
      StorageService.addUser({
        id: Math.random().toString(36).substr(2, 9),
        username: p.username!,
        password: p.password!,
        name: p.name!,
        role: UserRole.USER,
        salaryMode: p.salaryMode!,
        hourlyRate: p.hourlyRate || 0,
        monthlySalary: p.monthlySalary || 0
      });
    });
    addAudit(AuditAction.BATCH_IMPORT, `批量匯入員工: ${validOnes.length} 位`);
    alert(`成功匯入 ${validOnes.length} 位員工`);
    window.location.reload();
  };

  // 處理員工資料更新
  const handleUserUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    // 比較舊資料與新資料以產生詳細 Log
    const original = users.find(u => u.id === editingUser.id);
    if (original) {
      const changes: string[] = [];
      if (original.name !== editingUser.name) changes.push(`姓名: ${original.name} -> ${editingUser.name}`);
      if (original.salaryMode !== editingUser.salaryMode) changes.push(`模式: ${original.salaryMode} -> ${editingUser.salaryMode}`);
      if (original.hourlyRate !== editingUser.hourlyRate) changes.push(`時薪: ${original.hourlyRate} -> ${editingUser.hourlyRate}`);
      if (original.monthlySalary !== editingUser.monthlySalary) changes.push(`月薪: ${original.monthlySalary} -> ${editingUser.monthlySalary}`);
      
      const details = changes.length > 0 ? `異動內容: ${changes.join(', ')}` : '未變更實質內容';
      StorageService.updateUser(editingUser);
      addAudit(AuditAction.UPDATE_USER, details, editingUser);
    }
    
    setEditingUser(null);
    window.location.reload();
  };

  // 處理新增員工
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get('name') as string;
    const username = formData.get('username') as string;
    const password = (formData.get('password') as string) || '123456';
    const salaryMode = formData.get('salaryMode') as 'hourly' | 'monthly';
    const rate = Number(formData.get('rate'));

    if (users.some(u => u.username === username)) {
      alert('帳號已存在');
      return;
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      password,
      name,
      role: UserRole.USER,
      salaryMode,
      hourlyRate: salaryMode === 'hourly' ? rate : 0,
      monthlySalary: salaryMode === 'monthly' ? rate : 0,
    };

    StorageService.addUser(newUser);
    const details = `初次建立: 帳號=${username}, 模式=${salaryMode}, 金額=${rate}`;
    addAudit(AuditAction.CREATE_USER, details, newUser);
    setShowAddUser(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800">管理主控台</h2>
          <p className="text-gray-400 text-xs sm:text-sm">全方位人力資源與系統稽核管理</p>
        </div>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'logs', label: '打卡日誌' },
          { id: 'users', label: '人員管理' },
          { id: 'export', label: '報表匯出' },
          { id: 'audit', label: '稽核日誌' }
        ].map(t => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id as any)} 
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">員工</label>
              <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm" value={filter.userId} onChange={e => setFilter({...filter, userId: e.target.value})}>
                <option value="all">全體員工</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">開始日期</label>
              <input type="date" className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">結束日期</label>
              <input type="date" className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} />
            </div>
            <button onClick={() => setShowManualAdd(true)} className="bg-indigo-600 text-white h-10 px-4 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 w-full transition-all">補打卡</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[600px]">
              <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] tracking-wider uppercase">
                <tr><th className="px-6 py-4">員工</th><th className="px-6 py-4">打卡時間</th><th className="px-6 py-4">動作</th><th className="px-6 py-4">薪資快照</th><th className="px-6 py-4">來源</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRecords.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold text-gray-800">{users.find(u => u.id === r.userId)?.name || '未知'}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${r.type === '簽到' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{r.type}</span></td>
                    <td className="px-6 py-4 text-[11px] font-medium text-gray-600">{r.snapshotSalaryMode === 'monthly' ? `$${r.snapshotMonthlySalary}/月` : `$${r.snapshotHourlyRate}/時`}</td>
                    <td className="px-6 py-4 text-[10px] text-gray-400 font-mono italic">{r.location ? `經緯: ${r.location.lat.toFixed(2)},${r.location.lng.toFixed(2)}` : r.id.startsWith('manual-') ? '管理員手動' : '一般打卡'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">員工名冊 ({users.length})</h3>
            <div className="flex space-x-2">
              <button onClick={() => setShowBatchImport(true)} className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold shadow-md shadow-green-100 hover:bg-green-700 transition-all">📥 批量</button>
              <button onClick={() => setShowAddUser(true)} className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all">+ 新增</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(u => (
              <div key={u.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-indigo-200 transition-all">
                <div className="truncate">
                  <p className="font-bold text-gray-800 truncate">{u.name}</p>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">@{u.username}</p>
                  <div className="text-[11px] text-indigo-600 font-bold mt-2 bg-indigo-50 px-2 py-0.5 rounded-lg w-fit">
                    {u.salaryMode === 'monthly' ? `月薪 $${u.monthlySalary.toLocaleString()}` : `時薪 $${u.hourlyRate.toLocaleString()}`}
                  </div>
                </div>
                <button onClick={() => setEditingUser(u)} className="p-2.5 text-gray-300 group-hover:text-indigo-600 bg-gray-50 group-hover:bg-indigo-50 rounded-xl transition-all">✏️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'export' && (
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-gray-100 max-w-lg mx-auto text-center">
          <div className="text-4xl sm:text-5xl mb-4">📊</div>
          <h3 className="text-lg sm:text-xl font-black mb-2">報表產生中心</h3>
          <p className="text-gray-400 text-xs sm:text-sm mb-8">選擇週期，系統將自動計算勞基法加班費並產生 Excel。</p>
          <div className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">年份</label>
                <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold" value={exportConfig.year} onChange={e => setExportConfig({...exportConfig, year: parseInt(e.target.value)})}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y} 年</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">月份</label>
                <select className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold" value={exportConfig.month} onChange={e => setExportConfig({...exportConfig, month: e.target.value})}>
                  <option value="all">整年度</option>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m} 月</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleExport} className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95">產生 Excel 報表</button>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* 稽核日誌搜尋與過濾 UI */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">關鍵字搜尋</label>
              <input 
                type="text" 
                placeholder="搜尋行為、操作者或詳情..." 
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48 space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">對象篩選</label>
              <select 
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm"
                value={auditTargetFilter}
                onChange={e => setAuditTargetFilter(e.target.value)}
              >
                <option value="all">全體對象</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
              <span className="font-bold text-gray-700 text-sm">系統異動追蹤 (Audit Log)</span>
              <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-full">共 {filteredAuditLogs.length} 筆</span>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs min-w-[800px]">
                <thead className="bg-gray-50 text-gray-400 font-bold text-[10px] tracking-wider uppercase">
                  <tr>
                    <th className="px-6 py-4">時間</th>
                    <th className="px-6 py-4">操作者</th>
                    <th className="px-6 py-4">行為</th>
                    <th className="px-6 py-4">對象</th>
                    <th className="px-6 py-4">異動詳情 (異動哪些資料)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAuditLogs.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">無符合條件的稽核紀錄</td></tr>
                  ) : (
                    filteredAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-400 text-[10px] tabular-nums">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4 font-bold text-gray-700">{log.operatorName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black whitespace-nowrap 
                            ${log.action === AuditAction.UPDATE_USER ? 'bg-indigo-50 text-indigo-700' : 
                              log.action === AuditAction.CREATE_USER ? 'bg-green-50 text-green-700' : 
                              log.action === AuditAction.BATCH_IMPORT ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-700'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-medium">{log.targetName || '-'}</td>
                        <td className="px-6 py-4 text-[11px] text-gray-500 font-medium break-words max-w-sm" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 批量匯入 Modal */}
      {showBatchImport && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
            <div className="h-2 bg-indigo-600 w-full shrink-0"></div> 
            <div className="p-6 sm:p-8 overflow-y-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-black">📥 批量匯入員工</h3>
                  <p className="text-xs text-gray-400 mt-1">請上傳包含員工姓名、帳號、薪資資訊之 Excel</p>
                </div>
                <button onClick={handleDownloadTemplate} className="text-[10px] font-black tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-all uppercase">⬇️ 下載範本</button>
              </div>
              <input type="file" accept=".xlsx, .xls" onChange={handleFileImport} className="block w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 mb-6 cursor-pointer"/>
              
              {importPreview.length > 0 && (
                <div className="rounded-2xl border border-gray-100 mb-6 overflow-hidden">
                  <div className="max-h-60 overflow-y-auto no-scrollbar">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-gray-50 sticky top-0 font-bold text-gray-400">
                        <tr><th className="p-3">姓名</th><th className="p-3">帳號</th><th className="p-3">薪資</th><th className="p-3">狀態</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {importPreview.map((p, i) => (
                          <tr key={i} className={p.status === 'invalid' ? 'bg-red-50/30' : ''}>
                            <td className="p-3 font-bold text-gray-700">{p.name}</td>
                            <td className="p-3 text-gray-500">{p.username}</td>
                            <td className="p-3 font-mono">{p.salaryMode === 'hourly' ? `$${p.hourlyRate}/時` : `$${p.monthlySalary}/月`}</td>
                            <td className="p-3">
                              {p.status === 'valid' ? <span className="text-green-500 font-bold">✓ 合規</span> : <span className="text-red-500 font-bold" title={p.error}>✕ 錯誤</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="flex space-x-3 pt-2">
                <button onClick={() => {setShowBatchImport(false); setImportPreview([]);}} className="flex-1 py-3 text-gray-400 font-bold text-sm">取消</button>
                <button onClick={confirmImport} disabled={!importPreview.some(p => p.status === 'valid')} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 disabled:opacity-50 text-sm">執行匯入 ({importPreview.filter(p => p.status === 'valid').length})</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 手動補打卡 Modal */}
      {showManualAdd && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden relative">
            <div className="h-2 bg-indigo-600 w-full shrink-0"></div>
            <div className="p-6 sm:p-8">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">✍️ 補登考勤</h3>
              <form onSubmit={handleManualAdd} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">選擇對象</label>
                  <select className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-indigo-200 text-sm" value={manualEntry.userId} onChange={e => setManualEntry({...manualEntry, userId: e.target.value})} required>
                    <option value="">請選擇員工</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">日期</label>
                    <input type="date" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm" value={manualEntry.date} onChange={e => setManualEntry({...manualEntry, date: e.target.value})} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">時間</label>
                    <input type="time" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm" value={manualEntry.time} onChange={e => setManualEntry({...manualEntry, time: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">類型</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setManualEntry({...manualEntry, type: RecordType.IN})} className={`py-3 rounded-xl font-bold text-xs transition-all ${manualEntry.type === RecordType.IN ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>簽到 (IN)</button>
                    <button type="button" onClick={() => setManualEntry({...manualEntry, type: RecordType.OUT})} className={`py-3 rounded-xl font-bold text-xs transition-all ${manualEntry.type === RecordType.OUT ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>簽退 (OUT)</button>
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowManualAdd(false)} className="flex-1 py-3 text-gray-400 font-bold text-sm">取消</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-xl shadow-indigo-100 text-sm">確認補登</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 編輯員工 Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden relative">
            <div className="h-2 bg-indigo-600 w-full shrink-0"></div>
            <div className="p-6 sm:p-8">
              <h3 className="text-xl font-black mb-6">修改資料：{editingUser.name}</h3>
              <form onSubmit={handleUserUpdateSubmit} className="space-y-4">
                <input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} placeholder="姓名" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm" required />
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-xl">
                  <button type="button" onClick={() => setEditingUser({...editingUser, salaryMode: 'hourly', monthlySalary: 0})} className={`py-2 rounded-lg text-xs font-bold transition-all ${editingUser.salaryMode === 'hourly' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>時薪制</button>
                  <button type="button" onClick={() => setEditingUser({...editingUser, salaryMode: 'monthly', hourlyRate: 0})} className={`py-2 rounded-lg text-xs font-bold transition-all ${editingUser.salaryMode === 'monthly' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>月薪制</button>
                </div>
                <input type="number" value={editingUser.salaryMode === 'hourly' ? editingUser.hourlyRate : editingUser.monthlySalary} onChange={e => setEditingUser(editingUser.salaryMode === 'hourly' ? {...editingUser, hourlyRate: Number(e.target.value)} : {...editingUser, monthlySalary: Number(e.target.value)})} placeholder="金額" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm" required />
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 text-gray-400 font-bold text-sm">取消</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-xl text-sm">更新資料</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 新增員工 Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden relative">
            <div className="h-2 bg-indigo-600 w-full shrink-0"></div>
            <div className="p-6 sm:p-8">
              <h3 className="text-xl font-black mb-6">建立新帳號</h3>
              <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                <input name="name" placeholder="員工真实姓名" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm" required />
                <input name="username" placeholder="登入帳號" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm" required />
                <input name="password" type="password" placeholder="密碼 (預設 123456)" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <select name="salaryMode" className="px-4 py-3 bg-gray-50 rounded-xl text-sm"><option value="hourly">時薪</option><option value="monthly">月薪</option></select>
                  <input name="rate" type="number" placeholder="金額" className="px-4 py-3 bg-gray-50 rounded-xl text-sm" required />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-3 text-gray-400 font-bold text-sm">取消</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-xl text-sm">建立並存檔</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
