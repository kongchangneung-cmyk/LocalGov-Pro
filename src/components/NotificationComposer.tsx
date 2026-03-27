import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, query, orderBy } from '../firebase';
import { createNotification, sendToRole, sendToAll, NotificationType } from '../utils/notificationService';
import { Send, Users, User, Shield, Info, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion } from 'motion/react';

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
}

const NotificationComposer: React.FC = () => {
  const [targetType, setTargetType] = useState<'all' | 'role' | 'user'>('all');
  const [targetValue, setTargetValue] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('info');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const roles = ['admin', 'director', 'engineer', 'staff', 'viewer'];

  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'), orderBy('name'));
      const snapshot = await getDocs(q);
      const userData: UserProfile[] = [];
      snapshot.forEach(doc => {
        userData.push({ ...doc.data(), uid: doc.id } as UserProfile);
      });
      setUsers(userData);
    };
    fetchUsers();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { title, message, type };
      
      if (targetType === 'all') {
        await sendToAll(data);
      } else if (targetType === 'role') {
        await sendToRole(targetValue, data);
      } else if (targetType === 'user') {
        await createNotification({ ...data, userId: targetValue });
      }
      
      setSuccess(true);
      setTitle('');
      setMessage('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error sending notification:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">ส่งการแจ้งเตือน</h2>
          <p className="text-neutral-500 font-medium">ส่งข้อความแจ้งเตือนไปยังผู้ใช้หรือกลุ่มผู้ใช้ในระบบ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSend} className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-8 space-y-6">
              {/* Target Selection */}
              <div className="space-y-4">
                <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">ผู้รับการแจ้งเตือน</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => { setTargetType('all'); setTargetValue(''); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${targetType === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-neutral-50 text-neutral-500 border-neutral-100 hover:border-neutral-200'}`}
                  >
                    <Users className="w-6 h-6" />
                    <span className="text-xs font-bold uppercase tracking-widest">ทุกคน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTargetType('role'); setTargetValue(roles[0]); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${targetType === 'role' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-neutral-50 text-neutral-500 border-neutral-100 hover:border-neutral-200'}`}
                  >
                    <Shield className="w-6 h-6" />
                    <span className="text-xs font-bold uppercase tracking-widest">ตามบทบาท</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTargetType('user'); setTargetValue(users[0]?.uid || ''); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${targetType === 'user' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-neutral-50 text-neutral-500 border-neutral-100 hover:border-neutral-200'}`}
                  >
                    <User className="w-6 h-6" />
                    <span className="text-xs font-bold uppercase tracking-widest">ระบุคน</span>
                  </button>
                </div>

                {targetType === 'role' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <select
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-slate-900"
                    >
                      {roles.map(role => (
                        <option key={role} value={role}>{role.toUpperCase()}</option>
                      ))}
                    </select>
                  </motion.div>
                )}

                {targetType === 'user' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <select
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-slate-900"
                    >
                      {users.map(u => (
                        <option key={u.uid} value={u.uid}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </motion.div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">หัวข้อ</label>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ระบุหัวข้อการแจ้งเตือน..."
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">ข้อความ</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="ระบุรายละเอียดข้อความ..."
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-medium text-slate-600 resize-none"
                  />
                </div>
              </div>

              {/* Type Selection */}
              <div className="space-y-4">
                <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">ประเภทการแจ้งเตือน</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { val: 'info', label: 'ทั่วไป', icon: Info, color: 'blue' },
                    { val: 'warning', label: 'คำเตือน', icon: AlertCircle, color: 'amber' },
                    { val: 'error', label: 'สำคัญมาก', icon: AlertCircle, color: 'red' },
                    { val: 'success', label: 'สำเร็จ', icon: CheckCircle2, color: 'green' }
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setType(t.val as NotificationType)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${type === t.val ? `bg-${t.color}-50 border-${t.color}-200 text-${t.color}-700 ring-2 ring-${t.color}-500/20` : 'bg-neutral-50 border-neutral-100 text-neutral-500 hover:border-neutral-200'}`}
                    >
                      <t.icon className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
              {success ? (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-green-600 font-bold"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  ส่งการแจ้งเตือนสำเร็จแล้ว
                </motion.div>
              ) : (
                <div />
              )}
              <button
                disabled={loading}
                type="submit"
                className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                ส่งข้อความ
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white">
            <h4 className="text-lg font-black mb-4 tracking-tight">ตัวอย่างการแสดงผล</h4>
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 
                  type === 'error' ? 'bg-red-500/20 text-red-400' : 
                  type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {type === 'warning' || type === 'error' ? <AlertCircle className="w-4 h-4" /> : 
                   type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-black mb-0.5 truncate">{title || 'หัวข้อการแจ้งเตือน'}</h5>
                  <p className="text-[10px] text-white/60 leading-relaxed line-clamp-2">{message || 'ข้อความที่จะแสดงในระบบ...'}</p>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-white/40 mt-6 font-bold uppercase tracking-widest leading-relaxed">
              * การส่งการแจ้งเตือนแบบกลุ่มอาจใช้เวลาสักครู่ในการประมวลผลสำหรับผู้ใช้จำนวนมาก
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm">
            <h4 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-widest">สถิติการส่ง</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 font-medium tracking-tight">ส่งวันนี้</span>
                <span className="text-sm font-black text-slate-900">12 ครั้ง</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 font-medium tracking-tight">ผู้รับทั้งหมด</span>
                <span className="text-sm font-black text-slate-900">45 คน</span>
              </div>
              <div className="h-px bg-neutral-100" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 font-medium tracking-tight">อัตราการเปิดอ่าน</span>
                <span className="text-sm font-black text-green-600">85%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationComposer;
