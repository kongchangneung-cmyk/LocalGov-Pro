import React, { useEffect, useState } from 'react';
import { useAuth } from '../useAuth';
import { db, collection, onSnapshot, query, orderBy } from '../firebase';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { Project } from './Dashboard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  HardHat, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData: Project[] = [];
      snapshot.forEach((doc) => {
        projectsData.push(doc.data() as Project);
      });
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'Error loading admin data');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'In Progress').length,
    completed: projects.filter(p => p.status === 'Completed').length,
    delayed: projects.filter(p => p.status === 'Delayed').length,
    totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
  };

  const statusData = [
    { name: 'กำลังก่อสร้าง', value: stats.inProgress, color: '#3b82f6' },
    { name: 'แล้วเสร็จ', value: stats.completed, color: '#22c55e' },
    { name: 'ล่าช้า', value: stats.delayed, color: '#ef4444' },
  ];

  const progressData = projects.slice(0, 10).map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    progress: p.progress,
    budget: p.budget / 1000000
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="โครงการทั้งหมด" 
          value={stats.total} 
          icon={HardHat} 
          color="bg-neutral-900" 
          trend="+2 จากเดือนที่แล้ว"
          trendUp={true}
        />
        <StatCard 
          label="กำลังก่อสร้าง" 
          value={stats.inProgress} 
          icon={Clock} 
          color="bg-blue-500" 
          trend="ปกติ"
          trendUp={true}
        />
        <StatCard 
          label="แล้วเสร็จ" 
          value={stats.completed} 
          icon={CheckCircle2} 
          color="bg-green-500" 
          trend="+5 ในปีนี้"
          trendUp={true}
        />
        <StatCard 
          label="ล่าช้า" 
          value={stats.delayed} 
          icon={AlertCircle} 
          color="bg-red-500" 
          trend="-1 จากสัปดาห์ก่อน"
          trendUp={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">ความก้าวหน้าโครงการ (Top 10)</h3>
              <p className="text-sm text-neutral-500">เปรียบเทียบเปอร์เซ็นต์ความคืบหน้า</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-600">
              <TrendingUp className="w-3 h-3" />
              Real-time
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="progress" fill="#171717" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Summary */}
        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-neutral-900 mb-2">งบประมาณรวม</h3>
          <p className="text-sm text-neutral-500 mb-8">ปีงบประมาณ 2569</p>
          
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="text-5xl font-black text-neutral-900 mb-2">
              {(stats.totalBudget / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-8">บาท</div>
            
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <Wallet className="text-white w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-green-700">เบิกจ่ายแล้ว</span>
                </div>
                <span className="text-sm font-black text-green-700">32.4M</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-neutral-400 rounded-lg flex items-center justify-center">
                    <Wallet className="text-white w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-neutral-600">คงเหลือ</span>
                </div>
                <span className="text-sm font-black text-neutral-900">26.0M</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Distribution & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-8">สัดส่วนสถานะโครงการ</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-neutral-900">แจ้งเตือนโครงการล่าช้า</h3>
            <span className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase">Urgent</span>
          </div>
          <div className="space-y-4">
            {projects.filter(p => p.status === 'Delayed').map((project, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100 group hover:bg-red-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center shrink-0">
                    <AlertCircle className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">{project.name}</h4>
                    <p className="text-xs text-red-600 font-medium">ความก้าวหน้า {project.progress}% (ล่าช้ากว่าแผน 15%)</p>
                  </div>
                </div>
                <button className="p-2 text-red-400 hover:text-red-600">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            ))}
            {stats.delayed === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">ไม่มีโครงการล่าช้าในขณะนี้</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  icon: any;
  color: string;
  trend: string;
  trendUp: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, trend, trendUp }) => (
  <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-lg`}>
        <Icon className="text-white w-6 h-6" />
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-bold ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
        {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {trend}
      </div>
    </div>
    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-3xl font-black text-neutral-900">{value}</p>
  </div>
);

export default AdminDashboard;
