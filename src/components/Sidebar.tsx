import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { 
  LayoutDashboard, 
  HardHat, 
  TrendingUp, 
  ClipboardCheck, 
  Wallet, 
  FileText, 
  Map as MapIcon, 
  BarChart3, 
  Users, 
  LogOut,
  Menu,
  X,
  ShieldCheck,
  User as UserIcon,
  ChevronRight,
  Settings,
  Bell,
  MapPin
} from 'lucide-react';

const Sidebar: React.FC<{ isOpen: boolean; setIsOpen: (open: boolean) => void }> = ({ isOpen, setIsOpen }) => {
  const { profile, logout, isAdmin, isDirector, isEngineer, isStaff } = useAuth();
  const location = useLocation();

  const menuItems = [
    { id: 'overview', label: 'Dashboard (ภาพรวม)', icon: LayoutDashboard, path: '/admin', roles: ['admin', 'director', 'engineer', 'staff', 'viewer'] },
    { id: 'infrastructure', label: 'โครงสร้างพื้นฐาน (Infrastructure)', icon: HardHat, path: '/admin/manage?tab=infrastructure', roles: ['admin', 'staff', 'engineer'] },
    { id: 'maintenance', label: 'งานซ่อมบำรุง (Maintenance)', icon: TrendingUp, path: '/admin/manage?tab=maintenance', roles: ['admin', 'engineer', 'staff'] },
    { id: 'building_control', label: 'ควบคุมอาคาร (Building Control)', icon: ClipboardCheck, path: '/admin/manage?tab=building_control', roles: ['admin', 'engineer'] },
    { id: 'reports', label: 'รายงานและสถิติ', icon: BarChart3, path: '/admin/manage?tab=reports', roles: ['admin', 'director', 'staff'] },
    { id: 'notifications', label: 'ส่งการแจ้งเตือน', icon: Bell, path: '/admin/manage?tab=notifications', roles: ['admin'] },
    { id: 'settings', label: 'ตั้งค่าระบบและสำรองข้อมูล', icon: Settings, path: '/admin/manage?tab=settings', roles: ['admin'] },
    { id: 'users', label: 'จัดการผู้ใช้งาน', icon: Users, path: '/admin/manage?tab=users', roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(profile?.role || '') || isAdmin
  );

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname === '/admin/manage' && location.search.includes(path.split('=')[1]);
  };

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-20'} bg-white border-r border-neutral-200 transition-all duration-300 flex flex-col sticky top-0 h-screen z-50`}>
      <div className="p-5 flex items-center gap-3 border-b border-neutral-100">
        <div className="w-9 h-9 bg-neutral-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-neutral-900/20">
          <ShieldCheck className="text-white w-5 h-5" />
        </div>
        {isOpen && (
          <div className="overflow-hidden">
            <h1 className="text-neutral-900 font-black tracking-tight truncate">LocalGov Pro</h1>
            <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest truncate">Engineering Hub</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-3">
        {filteredMenuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
              isActive(item.path)
                ? 'bg-neutral-900 text-white shadow-xl shadow-neutral-900/10' 
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <item.icon className={`w-4.5 h-4.5 shrink-0 ${isActive(item.path) ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-900'}`} />
            {isOpen && <span className="font-bold text-xs truncate">{item.label}</span>}
            {isOpen && isActive(item.path) && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
        <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white border border-neutral-200 mb-4 ${!isOpen && 'justify-center'}`}>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
            <UserIcon className="text-neutral-600 w-5 h-5" />
          </div>
          {isOpen && (
            <div className="overflow-hidden">
              <p className="text-neutral-900 text-xs font-black truncate">{profile?.name}</p>
              <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest truncate">{profile?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50 transition-all ${!isOpen && 'justify-center'}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isOpen && <span className="font-bold text-sm">ออกจากระบบ</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
