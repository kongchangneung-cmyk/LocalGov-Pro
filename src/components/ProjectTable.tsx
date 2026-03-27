import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Project } from './Dashboard';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, MoreVertical, Search, Eye, Database } from 'lucide-react';

interface ProjectTableProps {
  projects: Project[];
  isAdmin: boolean;
  highlightedProjectId?: string | null;
  onSync?: () => void;
}

const ProjectTable: React.FC<ProjectTableProps> = ({ projects, isAdmin, highlightedProjectId, onSync }) => {
  useEffect(() => {
    if (highlightedProjectId) {
      const element = document.getElementById(`project-row-${highlightedProjectId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedProjectId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'In Progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'Delayed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Delayed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
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
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-900 border-b border-slate-800">
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">ชื่อโครงการ</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">ประเภท</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">งบประมาณ</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">สถานะ</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">ผู้รับผิดชอบ</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">ผู้รับเหมา</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden 2xl:table-cell">ความก้าวหน้า</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden 2xl:table-cell">อัปเดตล่าสุด</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {projects.map((project) => (
            <tr 
              key={project.id} 
              id={`project-row-${project.id}`}
              className={`transition-all duration-500 group ${
                highlightedProjectId === project.id 
                  ? 'bg-orange-50 ring-2 ring-orange-500 ring-inset z-10' 
                  : 'hover:bg-neutral-50'
              }`}
            >
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className={`font-bold transition-colors truncate max-w-[200px] sm:max-w-none ${
                    highlightedProjectId === project.id ? 'text-orange-700' : 'text-neutral-900'
                  }`}>
                    {project.name}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">ID: {project.id}</span>
                  {/* Mobile-only info */}
                  <div className="flex flex-wrap gap-2 mt-1 md:hidden">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{project.type}</span>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest sm:hidden">{formatCurrency(project.budget)}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="text-sm text-neutral-600">{project.type}</span>
              </td>
              <td className="px-6 py-4 hidden sm:table-cell">
                <span className="text-sm font-mono font-black text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  {formatCurrency(project.budget)}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] sm:text-xs font-bold ${getStatusColor(project.status)}`}>
                  {getStatusIcon(project.status)}
                  <span className="hidden sm:inline">
                    {project.status === 'In Progress' ? 'กำลังดำเนินการ' : 
                     project.status === 'Completed' ? 'เสร็จสิ้น' : 
                     project.status === 'Delayed' ? 'ล่าช้า' : project.status}
                  </span>
                  <span className="sm:hidden">
                    {project.status === 'In Progress' ? 'ดำเนินการ' : 
                     project.status === 'Completed' ? 'เสร็จ' : 
                     project.status === 'Delayed' ? 'ล่าช้า' : project.status}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 hidden lg:table-cell">
                <span className="text-sm text-neutral-600 font-medium truncate max-w-[150px] block">
                  {project.responsiblePerson || project.supervisor || '-'}
                </span>
              </td>
              <td className="px-6 py-4 hidden xl:table-cell">
                <span className="text-sm text-neutral-600 font-medium truncate max-w-[150px] block">
                  {project.contractor || '-'}
                </span>
              </td>
              <td className="px-6 py-4 hidden 2xl:table-cell">
                <div className="flex items-center gap-3 min-w-[120px]">
                  <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        project.progress === 100 ? 'bg-green-500' : 
                        project.status === 'Delayed' ? 'bg-red-500' : 'bg-slate-900'
                      }`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-neutral-900">{project.progress}%</span>
                </div>
              </td>
              <td className="px-6 py-4 hidden 2xl:table-cell">
                <span className="text-xs text-neutral-500">
                  {format(new Date(project.updatedAt), 'dd/MM/yyyy HH:mm')}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link 
                    to={`/projects/${project.id}`}
                    className="p-2 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {isAdmin && (
                    <button className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-neutral-200 border-dashed m-4">
          <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Search className="text-neutral-300 w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-neutral-900 tracking-tight">ไม่พบข้อมูลโครงการ</h3>
          <p className="text-neutral-500 max-w-xs mx-auto mt-2 mb-8 font-medium">
            ไม่พบรายการโครงการที่ตรงตามเงื่อนไข หรือยังไม่มีข้อมูลในระบบ
          </p>
          {onSync && (
            <button 
              onClick={onSync}
              className="flex items-center gap-2 px-8 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all active:scale-95"
            >
              <Database className="w-5 h-5" />
              Sync All
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectTable;
