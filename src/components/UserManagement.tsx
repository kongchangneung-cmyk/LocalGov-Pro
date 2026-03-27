import React, { useState, useEffect } from 'react';
import { useAuth } from '../useAuth';
import { db, collection, onSnapshot, query, orderBy, updateDoc, doc, setDoc } from '../firebase';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { UserProfile } from '../useAuth';
import { logAction } from '../services/auditService';
import { 
  Users, 
  Search, 
  Shield, 
  Mail, 
  Briefcase, 
  MoreVertical, 
  CheckCircle2, 
  XCircle,
  UserPlus,
  Filter,
  ArrowUpDown,
  X,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const UserManagement: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', name: '', role: 'viewer' as UserProfile['role'], position: '' });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: UserProfile[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ ...doc.data(), id: doc.id } as UserProfile);
      });
      setUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, 'Error loading users');
    });

    return () => unsubscribe();
  }, [user]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !inviteData.email) return;
    
    setLoading(true);
    try {
      // Create a dummy UID for the invited user based on email hash or just a random string
      // In a real app, you might use a different collection or a cloud function
      const invitedUserId = `invited_${inviteData.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const newProfile: UserProfile = {
        uid: invitedUserId,
        email: inviteData.email,
        name: inviteData.name,
        role: inviteData.role,
        position: inviteData.position,
        status: 'invited',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', invitedUserId), newProfile);
      await logAction(user?.uid || 'unknown', 'INVITE_USER', `Invited ${inviteData.email} as ${inviteData.role}`);
      
      setNotification({ type: 'success', message: `ส่งคำเชิญไปยัง ${inviteData.email} สำเร็จ` });
      setIsInviteModalOpen(false);
      setInviteData({ email: '', name: '', role: 'viewer', position: '' });
    } catch (error) {
      console.error('Error inviting user:', error);
      setNotification({ type: 'error', message: 'เกิดข้อผิดพลาดในการส่งคำเชิญ' });
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateRole = async (userId: string, newRole: string, userName: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      await logAction(user?.uid || 'unknown', 'UPDATE_USER_ROLE', `Updated role for ${userName} to ${newRole}`);
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const filteredUsers = users.filter(u => {
    const nameMatch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                     u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = selectedRole === 'all' || u.role === selectedRole;
    return nameMatch && roleMatch;
  });

  const roles = [
    { value: 'admin', label: 'ผู้ดูแลระบบ', color: 'bg-red-50 text-red-600 border-red-100' },
    { value: 'director', label: 'ผู้อำนวยการ', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { value: 'engineer', label: 'วิศวกร', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { value: 'staff', label: 'เจ้าหน้าที่', color: 'bg-green-50 text-green-600 border-green-100' },
    { value: 'viewer', label: 'ผู้เข้าชม', color: 'bg-neutral-50 text-neutral-600 border-neutral-100' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือ อีเมล..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-4 py-3 bg-white border border-neutral-200 rounded-xl">
            <Filter className="w-4 h-4 text-neutral-400" />
            <select 
              className="bg-transparent text-sm font-bold text-neutral-900 outline-none"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="all">ทุกสิทธิ์การใช้งาน</option>
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all"
        >
          <UserPlus className="w-5 h-5" />
          เชิญผู้ใช้งาน
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">ผู้ใช้งาน</th>
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">สิทธิ์การใช้งาน</th>
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">ตำแหน่ง</th>
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">วันที่สมัคร</th>
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">สถานะ</th>
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-200 overflow-hidden">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Shield className="w-5 h-5 text-neutral-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900">{user.name}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {isAdmin ? (
                      <select 
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border outline-none transition-all ${
                          roles.find(r => r.value === user.role)?.color || 'bg-neutral-50 text-neutral-600 border-neutral-100'
                        }`}
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id!, e.target.value, user.name)}
                      >
                        {roles.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        roles.find(r => r.value === user.role)?.color || 'bg-neutral-50 text-neutral-600 border-neutral-100'
                      }`}>
                        {roles.find(r => r.value === user.role)?.label}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-neutral-600">
                      <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                      {user.position || '-'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-bold text-neutral-400">
                      {user.createdAt ? format(new Date(user.createdAt), 'dd/MM/yyyy') : '-'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        user.status === 'invited' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 
                        user.status === 'disabled' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' :
                        'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                      }`} />
                      <span className="text-[10px] font-black text-neutral-900 uppercase tracking-widest">
                        {user.status || 'Active'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-neutral-300" />
            </div>
            <h4 className="text-lg font-bold text-neutral-900">ไม่พบผู้ใช้งาน</h4>
            <p className="text-sm text-neutral-500">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                <h3 className="text-xl font-black text-neutral-900 tracking-tight">เชิญผู้ใช้งานใหม่</h3>
                <button onClick={() => setIsInviteModalOpen(false)} className="p-2 hover:bg-neutral-200 rounded-xl transition-all">
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleInviteUser} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">อีเมลผู้ใช้งาน</label>
                  <input 
                    type="email" 
                    required
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                    value={inviteData.email}
                    onChange={e => setInviteData({...inviteData, email: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">ชื่อ-นามสกุล</label>
                  <input 
                    type="text" 
                    placeholder="ระบุชื่อผู้ใช้งาน"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                    value={inviteData.name}
                    onChange={e => setInviteData({...inviteData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">สิทธิ์การใช้งาน</label>
                    <select 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                      value={inviteData.role}
                      onChange={e => setInviteData({...inviteData, role: e.target.value as UserProfile['role']})}
                    >
                      {roles.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">ตำแหน่ง</label>
                    <input 
                      type="text" 
                      placeholder="ระบุตำแหน่ง"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                      value={inviteData.position}
                      onChange={e => setInviteData({...inviteData, position: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-900 rounded-xl font-bold hover:bg-neutral-200 transition-all"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all disabled:opacity-50"
                  >
                    {loading ? 'กำลังดำเนินการ...' : 'ส่งคำเชิญ'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-8 right-8 z-[150] animate-in slide-in-from-right duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
            notification.type === 'success' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-bold">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="ml-2">
              <X className="w-4 h-4 opacity-50 hover:opacity-100" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
