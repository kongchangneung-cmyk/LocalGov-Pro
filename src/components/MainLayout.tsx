import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, X, Bell, Search, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../useAuth';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { profile } = useAuth();

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-neutral-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-white/80">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 text-neutral-500 hover:bg-neutral-100 rounded-xl transition-all border border-transparent hover:border-neutral-200"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="relative hidden md:block w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4.5 h-4.5" />
              <input 
                type="text" 
                placeholder="ค้นหาข้อมูล..." 
                className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-neutral-600 uppercase tracking-widest">Live Sync</span>
            </div>
            
            <button className="p-2.5 text-neutral-500 hover:bg-neutral-100 rounded-xl transition-all border border-transparent hover:border-neutral-200 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            
            <div className="h-8 w-px bg-neutral-200 mx-2" />
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-neutral-900 tracking-tight">{profile?.name}</p>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{profile?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center shadow-lg shadow-neutral-900/20">
                <User className="text-white w-5 h-5" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
