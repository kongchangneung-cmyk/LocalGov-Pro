import React, { useEffect, useState } from 'react';
import { db, collection, onSnapshot, query, orderBy } from '../firebase';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { useAuth } from '../useAuth';
import { 
  DollarSign, 
  CheckCircle2, 
  TrendingUp, 
  Map as MapIcon, 
  Calendar, 
  ArrowUpRight, 
  Activity,
  Box,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import ProjectMap from './ProjectMap';
import ProjectTable from './ProjectTable';

export interface Project {
  id: string;
  name: string;
  type: string;
  budget: number;
  status: string;
  progress: number;
  lat: number;
  lng: number;
  updatedAt: string;
  fiscalYear?: string;
  contractor?: string;
  startDate?: string;
  endDate?: string;
  responsiblePerson?: string;
  description?: string;
  villageName?: string;
  villageNo?: number;
}

const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Project[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id } as Project);
      });
      setProjects(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'Error loading projects');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const avgProgress = projects.length > 0 
    ? projects.reduce((sum, p) => sum + p.progress, 0) / projects.length 
    : 0;

  const chartData = [
    { name: 'ม.ค.', value: 400 },
    { name: 'ก.พ.', value: 300 },
    { name: 'มี.ค.', value: 600 },
    { name: 'เม.ย.', value: 800 },
    { name: 'พ.ค.', value: 500 },
    { name: 'มิ.ย.', value: 900 },
  ];

  const statusData = [
    { name: 'Completed', value: projects.filter(p => p.status === 'Completed').length, color: '#10b981' },
    { name: 'In Progress', value: projects.filter(p => p.status === 'In Progress').length, color: '#3b82f6' },
    { name: 'Delayed', value: projects.filter(p => p.status === 'Delayed').length, color: '#ef4444' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-neutral-900 tracking-tight mb-2">ภาพรวมแดชบอร์ด</h1>
          <p className="text-neutral-500 font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            ข้อมูลอัปเดตล่าสุดเมื่อ {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl border border-neutral-200 flex">
            <button className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-bold shadow-lg shadow-neutral-900/20">รายเดือน</button>
            <button className="px-4 py-2 text-neutral-500 hover:bg-neutral-50 rounded-lg text-sm font-bold transition-all">รายปี</button>
          </div>
          <button className="p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all shadow-sm">
            <MoreVertical className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1 */}
        <div className="bg-neutral-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-neutral-900/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-500" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Box className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-xs font-black uppercase tracking-widest">
                <ArrowUpRight className="w-4 h-4" />
                +12%
              </div>
            </div>
            <div>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">โครงการทั้งหมด</p>
              <h2 className="text-5xl font-black tracking-tighter">{projects.length}</h2>
            </div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm hover:shadow-xl transition-all duration-500 group">
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center border border-neutral-100 group-hover:bg-neutral-900 group-hover:text-white transition-all duration-500">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1 text-green-500 text-xs font-black uppercase tracking-widest">
                <ArrowUpRight className="w-4 h-4" />
                +5.4%
              </div>
            </div>
            <div>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">งบประมาณรวม</p>
              <h2 className="text-4xl font-black tracking-tighter text-neutral-900">฿{(totalBudget / 1000000).toFixed(1)}M</h2>
            </div>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm hover:shadow-xl transition-all duration-500 group">
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center border border-green-100 group-hover:bg-green-600 group-hover:text-white transition-all duration-500">
                <CheckCircle2 className="w-6 h-6 text-green-600 group-hover:text-white" />
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs font-black uppercase tracking-widest">
                คงที่
              </div>
            </div>
            <div>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">เสร็จสิ้นแล้ว</p>
              <h2 className="text-4xl font-black tracking-tighter text-neutral-900">{projects.filter(p => p.status === 'Completed').length}</h2>
            </div>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm hover:shadow-xl transition-all duration-500 group">
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                <Activity className="w-6 h-6 text-blue-600 group-hover:text-white" />
              </div>
              <div className="flex items-center gap-1 text-blue-500 text-xs font-black uppercase tracking-widest">
                <TrendingUp className="w-4 h-4" />
                {avgProgress.toFixed(0)}%
              </div>
            </div>
            <div>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">ความก้าวหน้าเฉลี่ย</p>
              <h2 className="text-4xl font-black tracking-tighter text-neutral-900">{avgProgress.toFixed(1)}%</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Charts & Map Bento Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">แนวโน้มการเบิกจ่าย</h3>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">ข้อมูลย้อนหลัง 6 เดือน</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-neutral-900 rounded-full" />
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">งบประมาณ</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#171717" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#171717" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#a3a3a3', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '16px', 
                    border: '1px solid #e5e5e5',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: '700'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#171717" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm flex flex-col">
          <h3 className="text-xl font-black text-neutral-900 tracking-tight mb-2">สถานะโครงการ</h3>
          <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-8">แบ่งตามความคืบหน้า</p>
          
          <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-3xl font-black text-neutral-900 tracking-tighter">{projects.length}</p>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">รวม</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3 mt-6">
            {statusData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold text-neutral-600 uppercase tracking-widest">{item.name}</span>
                </div>
                <span className="text-sm font-black text-neutral-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map & Table Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white p-4 rounded-[2.5rem] border border-neutral-200 shadow-sm h-[500px] relative overflow-hidden">
          <div className="absolute top-8 left-8 z-10 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-neutral-200 shadow-xl">
            <div className="flex items-center gap-3 mb-1">
              <MapIcon className="w-5 h-5 text-neutral-900" />
              <h3 className="text-sm font-black text-neutral-900 tracking-tight">พิกัดโครงการ</h3>
            </div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">แสดงตำแหน่งโครงการทั้งหมด</p>
          </div>
          <ProjectMap projects={projects} />
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">โครงการล่าสุด</h3>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">รายการอัปเดต 5 อันดับแรก</p>
            </div>
            <button className="flex items-center gap-2 text-xs font-bold text-neutral-900 uppercase tracking-widest hover:gap-3 transition-all">
              ดูทั้งหมด <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ProjectTable projects={projects.slice(0, 5)} isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
