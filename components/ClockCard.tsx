
import React, { useState, useEffect } from 'react';
import { RecordType, AttendanceRecord, GeoLocation, User } from '../types';
import { StorageService } from '../services/storage';

interface ClockCardProps {
  user: User;
  onUpdate: () => void;
}

const ClockCard: React.FC<ClockCardProps> = ({ user, onUpdate }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClock = (type: RecordType) => {
    setStatus('loading');
    
    const performClock = (loc?: GeoLocation) => {
      const newRecord: AttendanceRecord = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        timestamp: Date.now(),
        type,
        location: loc
      };
      StorageService.addAttendance(newRecord);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
      onUpdate();
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => performClock({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => performClock(),
        { timeout: 5000 }
      );
    } else {
      performClock();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
      <div className="mb-6">
        <div className="text-5xl font-mono font-bold text-gray-800 tracking-tighter">
          {currentTime.toLocaleTimeString('zh-TW', { hour12: false })}
        </div>
        <div className="text-gray-400 font-medium mt-1">
          {currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleClock(RecordType.IN)}
          disabled={status === 'loading'}
          className="py-6 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
        >
          <div className="text-2xl mb-1">🌤️</div>
          簽到 (IN)
        </button>
        <button
          onClick={() => handleClock(RecordType.OUT)}
          disabled={status === 'loading'}
          className="py-6 bg-orange-500 text-white rounded-2xl font-bold shadow-lg hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50"
        >
          <div className="text-2xl mb-1">🌙</div>
          簽退 (OUT)
        </button>
      </div>

      {status === 'loading' && <p className="mt-4 text-indigo-500 animate-pulse font-medium text-sm">正在定位打卡中...</p>}
      {status === 'success' && <p className="mt-4 text-green-500 font-bold text-sm">✅ 打卡成功！</p>}
    </div>
  );
};

export default ClockCard;
