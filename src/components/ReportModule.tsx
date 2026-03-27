import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy } from '../firebase';
import { Project } from './Dashboard';
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar, 
  PieChart, 
  BarChart, 
  Printer, 
  Share2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

const ReportModule: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedYear, setSelectedYear] = useState('2567');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData: Project[] = [];
      snapshot.forEach((doc) => {
        projectsData.push({ ...doc.data(), id: doc.id } as Project);
      });
      setProjects(projectsData);
    });

    return () => unsubscribe();
  }, []);

  const filteredProjects = projects.filter(p => {
    const yearMatch = selectedYear === 'all' || p.fiscalYear === selectedYear;
    const typeMatch = selectedType === 'all' || p.type === selectedType;
    return yearMatch && typeMatch;
  });

  const stats = {
    total: filteredProjects.length,
    completed: filteredProjects.filter(p => p.status === 'Completed').length,
    inProgress: filteredProjects.filter(p => p.status === 'In Progress').length,
    delayed: filteredProjects.filter(p => p.status === 'Delayed').length,
    totalBudget: filteredProjects.reduce((sum, p) => sum + p.budget, 0),
  };

  const handleExport = (format: string) => {
    alert(`กำลังส่งออกรายงานในรูปแบบ ${format}...`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Report Filters & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-xl border border-neutral-100">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <select 
              className="bg-transparent text-sm font-bold text-neutral-900 outline-none"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">ทุกปีงบประมาณ</option>
              <option value="2567">2567</option>
              <option value="2566">2566</option>
              <option value="2565">2565</option>
            </select>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-xl border border-neutral-100">
            <Filter className="w-4 h-4 text-neutral-400" />
            <select 
              className="bg-transparent text-sm font-bold text-neutral-900 outline-none"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">ทุกประเภทโครงการ</option>
              <option value="Road">ถนน</option>
              <option value="Building">อาคาร</option>
              <option value="Water">แหล่งน้ำ</option>
              <option value="Electricity">ไฟฟ้า</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleExport('PDF')}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all"
          >
            <Download className="w-4 h-4" />
            ส่งออก PDF
          </button>
          <button 
            onClick={() => handleExport('Excel')}
            className="flex items-center gap-2 px-6 py-3 bg-white text-neutral-900 border border-neutral-200 rounded-xl font-bold hover:bg-neutral-50 transition-all"
          >
            <FileText className="w-4 h-4" />
            ส่งออก Excel
          </button>
          <button className="p-3 bg-neutral-50 text-neutral-400 rounded-xl hover:text-neutral-900 transition-colors">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Total</span>
          </div>
          <h3 className="text-2xl font-black text-neutral-900">{stats.total}</h3>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">โครงการทั้งหมด</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Success</span>
          </div>
          <h3 className="text-2xl font-black text-neutral-900">{stats.completed}</h3>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">เสร็จสิ้นแล้ว</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Active</span>
          </div>
          <h3 className="text-2xl font-black text-neutral-900">{stats.inProgress}</h3>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">กำลังดำเนินการ</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Delayed</span>
          </div>
          <h3 className="text-2xl font-black text-neutral-900">{stats.delayed}</h3>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-1">ล่าช้ากว่ากำหนด</p>
        </div>
      </div>

      {/* Detailed Report Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">ตารางสรุปโครงการ</h3>
            <p className="text-sm text-neutral-500">ข้อมูลโครงการแยกตามสถานะและงบประมาณ</p>
          </div>
          <button className="flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-neutral-900 transition-colors">
            ดูทั้งหมด
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">รหัสโครงการ</th>
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">ชื่อโครงการ</th>
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">งบประมาณ</th>
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">ความคืบหน้า</th>
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">สถานะ</th>
                <th className="px-8 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">ผู้รับผิดชอบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="px-8 py-4">
                    <span className="text-xs font-mono font-bold text-neutral-400">{project.id}</span>
                  </td>
                  <td className="px-8 py-4">
                    <p className="text-sm font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">{project.name}</p>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{project.type}</span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-sm font-black text-neutral-900">{formatCurrency(project.budget)}</span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden min-w-[60px]">
                        <div 
                          className="h-full bg-neutral-900 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-neutral-900">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      project.status === 'Completed' ? 'bg-green-50 text-green-600' :
                      project.status === 'Delayed' ? 'bg-red-50 text-red-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-xs font-bold text-neutral-600">{project.responsiblePerson || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportModule;
