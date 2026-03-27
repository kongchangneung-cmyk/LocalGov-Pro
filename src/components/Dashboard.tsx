import React, { useEffect, useState } from 'react';
import { db, collection, onSnapshot, query, orderBy, writeBatch, doc } from '../firebase';
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
  MoreVertical,
  ChevronDown,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
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
  contractNo?: string;
  inspectionCommittee?: string[];
  supervisor?: string;
  installments?: {
    name: string;
    percentage: number;
    status: 'Pending' | 'In Progress' | 'Completed';
    date?: string;
  }[];
  attachments?: {
    name: string;
    size: string;
    date: string;
    type?: string;
  }[];
}

type SortOption = 'updatedAt' | 'budget' | 'progress';
type DashboardTab = 'overview' | 'projects' | 'integration';

const Dashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedProjectId, setHighlightedProjectId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('updatedAt');
  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>('All');
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [syncSettings, setSyncSettings] = useState({
    sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    lastSync: null as string | null,
    autoSync: false
  });

  useEffect(() => {
    if (!user) return;

    // Load sync settings
    const settingsUnsubscribe = onSnapshot(doc(db, 'settings', 'sync'), (doc) => {
      if (doc.exists()) {
        setSyncSettings(prev => ({ ...prev, ...doc.data() }));
      }
    });

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

    return () => {
      unsubscribe();
      settingsUnsubscribe();
    };
  }, [user]);

  const handleMarkerClick = (projectId: string) => {
    setHighlightedProjectId(projectId);
    // Clear highlight after 3 seconds
    setTimeout(() => setHighlightedProjectId(null), 3000);
  };

  const handleSyncGoogleSheet = async (customSheetId?: string) => {
    const sheetId = customSheetId || prompt('กรุณาใส่ Google Sheet ID (ต้องเปิดเป็นสาธารณะ/Public):', syncSettings.sheetId);
    if (!sheetId) return;

    try {
      setLoading(true);
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch sheet');
      
      const csvText = await response.text();
      
      const rows = csvText.split('\n').map(row => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });

      if (rows.length < 2) {
        alert('ไม่พบข้อมูลใน Google Sheet');
        return;
      }

      const headers = rows[0].map(h => h.replace(/"/g, '').trim());
      const batch = writeBatch(db);
      
      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (values.length < headers.length || !values[0]) continue;
        
        const projectData: any = {};
        headers.forEach((header, index) => {
          projectData[header] = values[index];
        });

        const mappedProject = {
          name: projectData.name || projectData['ชื่อโครงการ'] || 'Untitled',
          type: projectData.type || projectData['ประเภท'] || 'ถนน',
          budget: Number(projectData.budget || projectData['งบประมาณ'] || 0),
          status: projectData.status || projectData['สถานะ'] || 'In Progress',
          progress: Number(projectData.progress || projectData['ความก้าวหน้า'] || 0),
          lat: Number(projectData.lat || 16.05),
          lng: Number(projectData.lng || 103.65),
          updatedAt: new Date().toISOString(),
          contractor: projectData.contractor || projectData['ผู้รับเหมา'] || '',
          responsiblePerson: projectData.responsiblePerson || projectData['ผู้รับผิดชอบ'] || '',
          fiscalYear: projectData.fiscalYear || '2569'
        };

        const docRef = doc(collection(db, 'projects'));
        batch.set(docRef, { ...mappedProject, id: `PROJ-${docRef.id.substr(0, 5).toUpperCase()}` });
        count++;
      }
      
      await batch.commit();
      
      // Update last sync time
      const now = new Date().toISOString();
      await writeBatch(db).set(doc(db, 'settings', 'sync'), { 
        lastSync: now,
        sheetId: sheetId
      }, { merge: true }).commit();

      alert(`ซิงค์ข้อมูลสำเร็จ! นำเข้าทั้งหมด ${count} รายการ`);
    } catch (error) {
      console.error('Sync error:', error);
      alert('เกิดข้อผิดพลาดในการซิงค์ข้อมูล: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const avgProgress = projects.length > 0 
    ? projects.reduce((sum, p) => sum + p.progress, 0) / projects.length 
    : 0;

  // Real chart data derived from projects
  const chartData = React.useMemo(() => {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIdx = (currentMonth - i + 12) % 12;
      last6Months.push({
        name: months[monthIdx],
        value: 0,
        monthIdx: monthIdx
      });
    }

    projects.forEach(p => {
      const date = new Date(p.updatedAt);
      const monthIdx = date.getMonth();
      const chartItem = last6Months.find(m => m.monthIdx === monthIdx);
      if (chartItem) {
        chartItem.value += p.budget;
      }
    });

    return last6Months;
  }, [projects]);

  const statusData = [
    { name: 'Completed', value: projects.filter(p => p.status === 'Completed').length, color: '#10b981' },
    { name: 'In Progress', value: projects.filter(p => p.status === 'In Progress').length, color: '#3b82f6' },
    { name: 'Delayed', value: projects.filter(p => p.status === 'Delayed').length, color: '#ef4444' },
  ];

  const stats = {
    totalProjects: projects.length,
    totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
    avgProgress: avgProgress
  };

  const uniqueFiscalYears = React.useMemo(() => {
    const years = projects.map(p => p.fiscalYear).filter((y): y is string => !!y);
    return Array.from(new Set(years)).sort((a, b) => b.localeCompare(a));
  }, [projects]);

  const uniqueProjectTypes = React.useMemo(() => {
    const types = projects.map(p => p.type).filter((t): t is string => !!t);
    return Array.from(new Set(types)).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const filteredAndSortedProjects = React.useMemo(() => {
    let filtered = [...projects];
    
    if (fiscalYearFilter !== 'All') {
      filtered = filtered.filter(p => p.fiscalYear === fiscalYearFilter);
    }

    if (projectTypeFilter !== 'All') {
      filtered = filtered.filter(p => p.type === projectTypeFilter);
    }

    return filtered.sort((a, b) => {
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
  }, [projects, sortBy, fiscalYearFilter]);

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
          <h1 className="text-4xl font-black text-neutral-900 tracking-tight mb-2">
            {activeTab === 'overview' ? 'ภาพรวมแดชบอร์ด' : 
             activeTab === 'projects' ? 'รายการโครงการทั้งหมด' : 'ระบบจัดการข้อมูลอัตโนมัติ'}
          </h1>
          <p className="text-neutral-500 font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            ข้อมูลอัปเดตล่าสุดเมื่อ {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl border border-neutral-200 flex">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              ภาพรวม
            </button>
            <button 
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'projects' ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              โครงการ
            </button>
            {isAdmin && (
              <button 
                onClick={() => setActiveTab('integration')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'integration' ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                การเชื่อมต่อ
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stat 1 */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all duration-500" />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <Box className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="flex items-center gap-1 text-orange-400 text-xs font-black uppercase tracking-widest">
                    <ArrowUpRight className="w-4 h-4" />
                    +12%
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">โครงการทั้งหมด</p>
                  <h2 className="text-5xl font-black tracking-tighter">
                    {projects.length}
                    <span className="text-orange-500 text-2xl ml-1">.</span>
                  </h2>
                </div>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-orange-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center border border-neutral-100 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1 text-green-500 text-xs font-black uppercase tracking-widest">
                    <ArrowUpRight className="w-4 h-4" />
                    +5.4%
                  </div>
                </div>
                <div>
                  <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">งบประมาณรวม</p>
                  <h2 className="text-4xl font-black tracking-tighter text-neutral-900">฿{(stats.totalBudget / 1000000).toFixed(1)}M</h2>
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
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
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
                      stroke="#f97316" 
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

          {/* Map Section */}
          <div className="bg-white p-4 rounded-[2.5rem] border border-neutral-200 shadow-sm h-[500px] relative overflow-hidden">
            <div className="absolute top-8 left-8 z-10 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-neutral-200 shadow-xl">
              <div className="flex items-center gap-3 mb-1">
                <MapIcon className="w-5 h-5 text-neutral-900" />
                <h3 className="text-sm font-black text-neutral-900 tracking-tight">พิกัดโครงการ</h3>
              </div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">แสดงตำแหน่งโครงการทั้งหมด</p>
            </div>
            <ProjectMap 
              projects={projects} 
              onMarkerClick={handleMarkerClick} 
              onSync={isAdmin ? handleSyncGoogleSheet : undefined}
            />
          </div>
        </>
      )}

      {activeTab === 'projects' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm flex flex-col min-h-[600px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">รายการโครงการ</h3>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">จัดเรียงตามที่เลือก</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Fiscal Year Filter */}
              <div className="relative">
                <select 
                  value={fiscalYearFilter}
                  onChange={(e) => setFiscalYearFilter(e.target.value)}
                  className="appearance-none text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 pr-8 outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                >
                  <option value="All">ปีงบประมาณ: ทั้งหมด</option>
                  {uniqueFiscalYears.map(year => (
                    <option key={year} value={year}>ปีงบประมาณ: {year}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-3 h-3 text-neutral-500" />
                </div>
              </div>

              {/* Project Type Filter */}
              <div className="relative">
                <select 
                  value={projectTypeFilter}
                  onChange={(e) => setProjectTypeFilter(e.target.value)}
                  className="appearance-none text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 pr-8 outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                >
                  <option value="All">ประเภท: ทั้งหมด</option>
                  {uniqueProjectTypes.map(type => (
                    <option key={type} value={type}>ประเภท: {type}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-3 h-3 text-neutral-500" />
                </div>
              </div>

              {/* Sort Select */}
              <div className="relative hidden sm:block">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2 pr-8 outline-none focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                >
                  <option value="updatedAt">อัปเดตล่าสุด</option>
                  <option value="budget">งบประมาณสูงสุด</option>
                  <option value="progress">ความก้าวหน้าสูงสุด</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-3 h-3 text-neutral-500" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <ProjectTable 
              projects={filteredAndSortedProjects} 
              isAdmin={isAdmin} 
              highlightedProjectId={highlightedProjectId}
              onSync={isAdmin ? handleSyncGoogleSheet : undefined}
            />
          </div>
        </div>
      )}

      {activeTab === 'integration' && isAdmin && (
        <IntegrationPanel 
          syncSettings={syncSettings} 
          onSync={handleSyncGoogleSheet}
          onUpdateSettings={async (newSettings) => {
            await writeBatch(db).set(doc(db, 'settings', 'sync'), newSettings, { merge: true }).commit();
          }}
        />
      )}
    </div>
  );
};

const IntegrationPanel: React.FC<{ 
  syncSettings: any, 
  onSync: (id?: string) => void,
  onUpdateSettings: (settings: any) => Promise<void>
}> = ({ syncSettings, onSync, onUpdateSettings }) => {
  const [sheetId, setSheetId] = useState(syncSettings.sheetId);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdateSettings({ sheetId });
    setSaving(false);
    alert('บันทึกการตั้งค่าสำเร็จ');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 space-y-8">
        {/* Configuration Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-neutral-900 tracking-tight">การตั้งค่าแหล่งข้อมูล</h3>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">เชื่อมต่อ Google Sheets</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-neutral-900 uppercase tracking-widest">Google Sheet ID</label>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-neutral-900 font-medium text-sm"
                  placeholder="ใส่ ID ของ Google Sheet..."
                />
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-neutral-900 text-white rounded-xl font-bold text-sm hover:bg-neutral-800 transition-all disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">
                * ต้องเปิดการเข้าถึงเป็น "ทุกคนที่มีลิงก์ (Public)" เพื่อให้ระบบสามารถดึงข้อมูลได้
              </p>
            </div>

            <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-neutral-200">
                  <Activity className="w-5 h-5 text-neutral-900" />
                </div>
                <div>
                  <p className="text-xs font-black text-neutral-900 uppercase tracking-widest">ซิงค์ข้อมูลล่าสุด</p>
                  <p className="text-sm font-bold text-neutral-500">
                    {syncSettings.lastSync ? format(new Date(syncSettings.lastSync), 'dd MMM yyyy, HH:mm') : 'ยังไม่มีการซิงค์'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => onSync(sheetId)}
                className="px-6 py-3 bg-white border border-neutral-200 rounded-xl font-bold text-sm hover:bg-neutral-50 transition-all shadow-sm flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                ซิงค์ตอนนี้
              </button>
            </div>
          </div>
        </div>

        {/* Automation Workflows */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
          <h3 className="text-xl font-black text-neutral-900 tracking-tight mb-8">แนวทางการจัดการข้อมูลอัตโนมัติ (Automation)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center text-xs font-black">PY</div>
                <h4 className="font-black text-neutral-900 text-sm uppercase tracking-tight">Python Automation</h4>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                เหมาะสำหรับการประมวลผลข้อมูลขนาดใหญ่ ใช้ Pandas และ gspread เพื่อดึงข้อมูลจาก API และอัปเดต Google Sheets อัตโนมัติผ่าน Task Scheduler.
              </p>
              <div className="bg-neutral-900 p-3 rounded-xl">
                <code className="text-[10px] text-orange-400 font-mono">import pandas as pd; import gspread;</code>
              </div>
            </div>

            <div className="p-6 bg-neutral-50 rounded-3xl border border-neutral-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center text-xs font-black">GAS</div>
                <h4 className="font-black text-neutral-900 text-sm uppercase tracking-tight">Google Apps Script</h4>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                ทำงานบน Cloud ของ Google โดยตรง สามารถตั้ง Trigger ให้ดึงข้อมูล CSV จาก URL หรือ Google Drive มาอัปเดตใน Sheet ได้ทุกวัน.
              </p>
              <div className="bg-neutral-900 p-3 rounded-xl">
                <code className="text-[10px] text-green-400 font-mono">Utilities.parseCsv(response)</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Setup Steps */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
          <h3 className="text-lg font-black tracking-tight mb-6">ขั้นตอนการตั้งค่า</h3>
          <div className="space-y-6">
            {[
              { step: '01', title: 'เลือกแหล่งจัดเก็บ', desc: 'ใช้ Google Sheets เป็นฐานข้อมูลกลาง' },
              { step: '02', title: 'เชื่อมต่อไฟล์', desc: 'ใช้ Google Drive API เชื่อมต่อแหล่งข้อมูล' },
              { step: '03', title: 'ตั้งเวลาอัปเดต', desc: 'กำหนดช่วงเวลา (รายวัน/รายชั่วโมง)' },
              { step: '04', title: 'จัดการ Encoding', desc: 'ใช้ UTF-8 เพื่อป้องกันปัญหาฟอนต์ไทย' }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-4">
                <span className="text-orange-500 font-black text-sm">{item.step}</span>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-orange-500 p-8 rounded-[2.5rem] text-white shadow-xl">
          <h3 className="text-lg font-black tracking-tight mb-6">ข้อดีของระบบ</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/20 pb-4">
              <span className="text-xs font-bold uppercase tracking-widest">ประหยัดเวลา</span>
              <span className="text-sm font-black">สูงมาก</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/20 pb-4">
              <span className="text-xs font-bold uppercase tracking-widest">ความแม่นยำ</span>
              <span className="text-sm font-black">ลดข้อผิดพลาด</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest">การขยายตัว</span>
              <span className="text-sm font-black">รองรับหลายไฟล์</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
