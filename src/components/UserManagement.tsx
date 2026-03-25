import React, { useState, useEffect } from 'react';
import { useAuth } from '../useAuth';
import { db, collection, onSnapshot, query, orderBy, updateDoc, doc } from '../firebase';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { UserProfile } from '../useAuth';
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
  ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

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

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
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
        <button className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all">
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
                    <select 
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border outline-none transition-all ${
                        roles.find(r => r.value === user.role)?.color || 'bg-neutral-50 text-neutral-600 border-neutral-100'
                      }`}
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                    >
                      {roles.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
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
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                      <span className="text-[10px] font-black text-neutral-900 uppercase tracking-widest">Active</span>
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
    </div>
  );
};

export default UserManagement;
