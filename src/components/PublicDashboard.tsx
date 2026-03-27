import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, limit } from '../firebase';
import { Project } from './Dashboard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Calendar,
  ShieldCheck,
  Globe,
  ExternalLink,
  LogIn,
  Map as MapIcon,
  Layers,
  Satellite,
  ChevronDown
} from 'lucide-react';
import PublicGISMap from './PublicGISMap';

const COLORS = ['#0f172a', '#f97316', '#3b82f6', '#8b5cf6', '#10b981'];

type SortOption = 'updatedAt' | 'budget' | 'progress';

const PublicDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('updatedAt');

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData: Project[] = [];
      snapshot.forEach((doc) => {
        projectsData.push({ ...doc.data(), id: doc.id } as Project);
      });
      setProjects(projectsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'Completed').length,
    inProgress: projects.filter(p => p.status === 'In Progress').length,
    delayed: projects.filter(p => p.status === 'Delayed').length,
    totalBudget: projects.reduce((acc, p) => acc + p.budget, 0),
    avgProgress: projects.length > 0 
      ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length) 
      : 0
  };

  const typeData = [
    { name: 'โครงสร้างพื้นฐาน', value: projects.filter(p => p.type === 'ถนน' || p.type === 'รางระบายน้ำ').length },
    { name: 'งานซ่อมบำรุง', value: projects.filter(p => p.type === 'ขยายไหล่ทาง').length },
    { name: 'ควบคุมอาคาร', value: projects.filter(p => p.type === 'อาคาร').length },
    { name: 'อื่นๆ', value: projects.filter(p => !['ถนน', 'รางระบายน้ำ', 'ขยายไหล่ทาง', 'อาคาร'].includes(p.type)).length },
  ].filter(d => d.value > 0);

  const budgetData = [
    { month: 'ต.ค.', actual: 480000, plan: 500000 },
    { month: 'พ.ย.', actual: 420000, plan: 450000 },
    { month: 'ธ.ค.', actual: 580000, plan: 600000 },
    { month: 'ม.ค.', actual: 450000, plan: 400000 },
    { month: 'ก.พ.', actual: 530000, plan: 550000 },
    { month: 'มี.ค.', actual: 650000, plan: 700000 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const sortedProjects = React.useMemo(() => {
    return [...projects].sort((a, b) => {
      if (sortBy === 'updatedAt') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'budget') {
        return b.budget - a.budget;
      }
      if (sortBy === 'progress') {
        return b.progress - a.progress;
      }
      return 0;
    });
  }, [projects, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-neutral-900 animate-pulse">กำลังโหลดข้อมูลสาธารณะ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-12">
      {/* Public Header */}
      <header className="bg-slate-900 text-white py-6 px-8 sticky top-0 z-50 shadow-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Globe className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">Public Dashboard</h1>
              <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">ระบบติดตามโครงการเพื่อประชาชน</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live: Just Now</span>
            </div>
            <Link to="/login" className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-orange-500 rounded-xl transition-all group border border-white/10 hover:border-orange-400">
              <span className="text-xs font-bold text-slate-300 group-hover:text-white uppercase tracking-widest">เจ้าหน้าที่</span>
              <LogIn className="w-4 h-4 text-slate-400 group-hover:text-white" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10 space-y-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#0f172a] p-6 rounded-[2rem] border border-white/5 shadow-2xl hover:shadow-orange-500/10 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12 blur-2xl" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-orange-500 transition-all duration-500">
                <LayoutDashboard className="text-orange-500 w-6 h-6 group-hover:text-white" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 tracking-widest uppercase">Active</span>
              </div>
            </div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">โครงการทั้งหมด</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-black text-white">{stats.total}</h3>
              <span className="text-xs font-bold text-white/20 uppercase">รายการ</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 transition-all duration-500">
                <CheckCircle2 className="text-emerald-600 w-6 h-6 group-hover:text-white" />
              </div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 tracking-widest uppercase">{Math.round((stats.completed/stats.total)*100)}% Success</span>
            </div>
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">ดำเนินการแล้วเสร็จ</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-black text-[#0f172a]">{stats.completed}</h3>
              <span className="text-xs font-bold text-neutral-300 uppercase">โครงการ</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:bg-orange-500 transition-all duration-500">
                <Clock className="text-orange-600 w-6 h-6 group-hover:text-white" />
              </div>
              <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 tracking-widest uppercase">{stats.avgProgress}% เฉลี่ย</span>
            </div>
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">กำลังดำเนินการ</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-black text-slate-900">{stats.inProgress}</h3>
              <span className="text-xs font-bold text-neutral-300 uppercase">โครงการ</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center group-hover:bg-rose-500 transition-all duration-500">
                <AlertCircle className="text-rose-600 w-6 h-6 group-hover:text-white" />
              </div>
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 tracking-widest uppercase">Attention</span>
            </div>
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">ความเสี่ยงสูง / ล่าช้า</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-4xl font-black text-[#0f172a]">{stats.delayed}</h3>
              <span className="text-xs font-bold text-neutral-300 uppercase">โครงการ</span>
            </div>
          </div>
        </div>

        {/* GIS Map Section */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <MapIcon className="text-white w-6 h-6" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">แผนที่ GIS โครงการ</h2>
              </div>
              <p className="text-neutral-500 font-medium max-w-2xl">
                ติดตามตำแหน่งโครงการพัฒนาในพื้นที่ พร้อมข้อมูลผังเมือง ผังชุมชน และแผนที่ดาวเทียมความละเอียดสูง เพื่อความโปร่งใสและการมีส่วนร่วมของประชาชน
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white border border-neutral-200 rounded-xl flex items-center gap-2 shadow-sm">
                <Satellite className="w-4 h-4 text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Satellite Ready</span>
              </div>
              <div className="px-4 py-2 bg-white border border-neutral-200 rounded-xl flex items-center gap-2 shadow-sm">
                <Layers className="w-4 h-4 text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">City Plan Layers</span>
              </div>
            </div>
          </div>
          
          <PublicGISMap projects={projects} />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
                <Globe className="text-orange-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900 mb-1">ผังเมืองรวม</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">แสดงแนวเขตการใช้ประโยชน์ที่ดินตามผังเมืองรวม เพื่อการพัฒนาพื้นที่อย่างเป็นระบบ</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                <Layers className="text-blue-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900 mb-1">ผังชุมชน</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">ข้อมูลโครงสร้างพื้นฐานระดับชุมชน ถนน แหล่งน้ำ และพื้นที่สาธารณะประโยชน์</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
                <Satellite className="text-slate-600 w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-neutral-900 mb-1">แผนที่ดาวเทียม</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">ภาพถ่ายดาวเทียมความละเอียดสูง ช่วยในการตรวจสอบสภาพพื้นที่จริงของโครงการ</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Budget vs Actual */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-neutral-900">สรุปงบประมาณรายเดือน (Budget vs Actual)</h3>
                <p className="text-sm text-neutral-500 font-medium">ข้อมูลปีงบประมาณ 2569 (ต.ค. 68 - ก.ย. 69)</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">เบิกจ่ายจริง</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-neutral-200 rounded-full" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">งบประมาณแผน</span>
                </div>
              </div>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Bar dataKey="actual" fill="#f97316" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="plan" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Job Distribution */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
            <h3 className="text-xl font-black text-neutral-900 mb-2">สัดส่วนประเภทงาน</h3>
            <p className="text-sm text-neutral-500 font-medium mb-8">Job Distribution (By Type)</p>
            <div className="h-[300px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-neutral-900">{stats.total}</span>
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">โครงการ</span>
              </div>
            </div>
            <div className="mt-8 space-y-3">
              {typeData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                    <span className="text-xs font-bold text-neutral-600">{entry.name}</span>
                  </div>
                  <span className="text-xs font-black text-neutral-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity & At-Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-neutral-900">งานที่มีความเสี่ยง / ล่าช้า</h3>
              <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-full">Needs Attention</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Job ID</th>
                    <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">ชื่อโครงการ</th>
                    <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {projects.filter(p => p.status === 'Delayed').slice(0, 5).map(project => (
                    <tr 
                      key={project.id} 
                      className="hover:bg-neutral-50 transition-all cursor-pointer group"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <td className="px-8 py-4 font-mono text-xs font-bold text-neutral-400">{project.id}</td>
                      <td className="px-8 py-4">
                        <p className="text-sm font-bold text-neutral-900 line-clamp-1 group-hover:text-orange-600 transition-colors">{project.name}</p>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase">{project.type}</p>
                      </td>
                      <td className="px-8 py-4">
                        <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-100">ล่าช้า</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xl font-black text-neutral-900">รายการโครงการ</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none text-[10px] font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 pr-7 outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="updatedAt">อัปเดตล่าสุด</option>
                    <option value="budget">งบประมาณสูงสุด</option>
                    <option value="progress">ความก้าวหน้าสูงสุด</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="w-3 h-3 text-neutral-500" />
                  </div>
                </div>
                <button className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline">ดูทั้งหมด</button>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">โครงการ</th>
                    <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">งบประมาณ</th>
                    <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">ความก้าวหน้า</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {sortedProjects.slice(0, 5).map(project => (
                    <tr 
                      key={project.id} 
                      className="hover:bg-neutral-50 transition-all cursor-pointer group"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <td className="px-8 py-4">
                        <p className="text-sm font-bold text-neutral-900 line-clamp-1 group-hover:text-orange-600 transition-colors">{project.name}</p>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase">{project.type}</p>
                      </td>
                      <td className="px-8 py-4 font-bold text-sm text-neutral-900">{formatCurrency(project.budget)}</td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-900 rounded-full" style={{width: `${project.progress}%`}} />
                          </div>
                          <span className="text-[10px] font-black text-neutral-900">{project.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-black text-neutral-900 uppercase tracking-tight">LocalGov Pro</p>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Smart Technical Office Platform</p>
          </div>
        </div>
        <p className="text-xs text-neutral-400 font-medium">© 2026 ระบบติดตามโครงการเพื่อประชาชน. สงวนลิขสิทธิ์.</p>
      </footer>
    </div>
  );
};

export default PublicDashboard;
