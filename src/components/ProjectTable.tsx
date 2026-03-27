import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Project } from './Dashboard';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Clock, MoreVertical, Search, Eye, Database, Filter, ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2 } from 'lucide-react';

interface ProjectTableProps {
  projects: Project[];
  isAdmin: boolean;
  highlightedProjectId?: string | null;
  onSync?: () => void;
}

type SortColumn = 'name' | 'budget' | 'progress' | 'status' | null;
type SortDirection = 'asc' | 'desc';

const ProjectTable: React.FC<ProjectTableProps> = ({ projects, isAdmin, highlightedProjectId, onSync }) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [contractorFilter, setContractorFilter] = useState<string>('All');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('All');
  const [fiscalYearFilter, setFiscalYearFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (highlightedProjectId) {
      const element = document.getElementById(`project-row-${highlightedProjectId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedProjectId]);

  const filteredProjects = useMemo(() => {
    let result = projects.filter(p => {
      const matchStatus = statusFilter === 'All' || p.status === statusFilter;
      const matchContractor = contractorFilter === 'All' || p.contractor === contractorFilter;
      const matchResponsible = responsibleFilter === 'All' || (p.responsiblePerson || p.supervisor) === responsibleFilter;
      const matchFiscalYear = fiscalYearFilter === 'All' || p.fiscalYear === fiscalYearFilter;
      const matchType = typeFilter === 'All' || p.type === typeFilter;
      return matchStatus && matchContractor && matchResponsible && matchFiscalYear && matchType;
    });

    if (sortColumn) {
      result.sort((a, b) => {
        let aValue: any = a[sortColumn];
        let bValue: any = b[sortColumn];
        
        if (sortColumn === 'budget' || sortColumn === 'progress') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        } else {
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [projects, statusFilter, contractorFilter, responsibleFilter, fiscalYearFilter, typeFilter, sortColumn, sortDirection]);

  const uniqueStatuses = useMemo(() => Array.from(new Set(projects.map(p => p.status))), [projects]);
  const uniqueContractors = useMemo(() => Array.from(new Set(projects.map(p => p.contractor).filter(Boolean))), [projects]);
  const uniqueResponsible = useMemo(() => Array.from(new Set(projects.map(p => p.responsiblePerson || p.supervisor).filter(Boolean))), [projects]);
  const uniqueFiscalYears = useMemo(() => Array.from(new Set(projects.map(p => p.fiscalYear).filter(Boolean))), [projects]);
  const uniqueTypes = useMemo(() => Array.from(new Set(projects.map(p => p.type).filter(Boolean))), [projects]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 ml-1 inline-block opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline-block text-orange-500" /> : <ArrowDown className="w-3 h-3 ml-1 inline-block text-orange-500" />;
  };

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
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-2 text-neutral-400">
          <Filter className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest sm:hidden">ตัวกรอง</span>
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap gap-3 w-full sm:w-auto">
          <select value={fiscalYearFilter} onChange={(e) => setFiscalYearFilter(e.target.value)} className="text-sm border border-neutral-200 rounded-lg px-3 py-2 outline-none bg-neutral-50 focus:bg-white transition-colors">
            <option value="All">ปีงบประมาณ: ทั้งหมด</option>
            {uniqueFiscalYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-sm border border-neutral-200 rounded-lg px-3 py-2 outline-none bg-neutral-50 focus:bg-white transition-colors">
            <option value="All">ประเภท: ทั้งหมด</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm border border-neutral-200 rounded-lg px-3 py-2 outline-none bg-neutral-50 focus:bg-white transition-colors">
            <option value="All">สถานะ: ทั้งหมด</option>
            {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={contractorFilter} onChange={(e) => setContractorFilter(e.target.value)} className="text-sm border border-neutral-200 rounded-lg px-3 py-2 outline-none bg-neutral-50 focus:bg-white transition-colors">
            <option value="All">ผู้รับเหมา: ทั้งหมด</option>
            {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={responsibleFilter} onChange={(e) => setResponsibleFilter(e.target.value)} className="text-sm border border-neutral-200 rounded-lg px-3 py-2 outline-none bg-neutral-50 focus:bg-white transition-colors">
            <option value="All">ผู้รับผิดชอบ: ทั้งหมด</option>
            {uniqueResponsible.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800">
              <th 
                className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('name')}
              >
                ชื่อโครงการ {renderSortIcon('name')}
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">ประเภท</th>
              <th 
                className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('budget')}
              >
                งบประมาณ {renderSortIcon('budget')}
              </th>
              <th 
                className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('status')}
              >
                สถานะ {renderSortIcon('status')}
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">ผู้รับผิดชอบ</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">ผู้รับเหมา</th>
              <th 
                className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('progress')}
              >
                ความก้าวหน้า {renderSortIcon('progress')}
              </th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hidden 2xl:table-cell">อัปเดตล่าสุด</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredProjects.map((project, index) => (
              <tr 
                key={project.id} 
                id={`project-row-${project.id}`}
                className={`transition-all duration-500 group ${
                  highlightedProjectId === project.id 
                    ? 'bg-orange-50 ring-2 ring-orange-500 ring-inset z-10' 
                    : index % 2 === 0 ? 'bg-white hover:bg-neutral-50' : 'bg-neutral-50/50 hover:bg-neutral-50'
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className={`font-bold transition-colors ${
                      highlightedProjectId === project.id ? 'text-orange-700' : 'text-neutral-900'
                    }`}>
                      {project.name}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">ID: {project.id}</span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-sm text-neutral-600">{project.type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-mono font-black text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    {formatCurrency(project.budget)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${getStatusColor(project.status)}`}>
                    {getStatusIcon(project.status)}
                    <span>
                      {project.status === 'In Progress' ? 'กำลังดำเนินการ' : 
                       project.status === 'Completed' ? 'เสร็จสิ้น' : 
                       project.status === 'Delayed' ? 'ล่าช้า' : project.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-sm text-neutral-600 font-medium truncate max-w-[150px] block">
                    {project.responsiblePerson || project.supervisor || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  <span className="text-sm text-neutral-600 font-medium truncate max-w-[150px] block">
                    {project.contractor || '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-[100px]">
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
                <td className="px-4 py-3 hidden 2xl:table-cell">
                  <span className="text-xs text-neutral-500">
                    {format(new Date(project.updatedAt), 'dd/MM/yyyy HH:mm')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                    <Link 
                      to={`/projects/${project.id}`}
                      className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 focus:text-blue-600 focus:bg-blue-50 rounded-lg transition-all outline-none"
                      title="ดูรายละเอียด"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {isAdmin && (
                      <>
                        <button 
                          className="p-1.5 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 focus:text-orange-600 focus:bg-orange-50 rounded-lg transition-colors outline-none"
                          title="แก้ไข"
                          onClick={(e) => { e.preventDefault(); alert('ฟังก์ชันแก้ไขอยู่ระหว่างการพัฒนา'); }}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50 rounded-lg transition-colors outline-none"
                          title="ลบ"
                          onClick={(e) => { e.preventDefault(); alert('ฟังก์ชันลบอยู่ระหว่างการพัฒนา'); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredProjects.map((project) => (
          <Link 
            key={project.id}
            to={`/projects/${project.id}`}
            id={`project-card-${project.id}`}
            className={`block bg-white p-5 rounded-3xl border transition-all duration-300 ${
              highlightedProjectId === project.id 
                ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/30' 
                : 'border-neutral-200 hover:border-neutral-300 active:scale-[0.98]'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">ID: {project.id}</span>
                  <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{project.type}</span>
                </div>
                <h3 className="font-black text-neutral-900 leading-tight">
                  {project.name}
                </h3>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${getStatusColor(project.status)}`}>
                {getStatusIcon(project.status)}
                {project.status === 'In Progress' ? 'ดำเนินการ' : 
                 project.status === 'Completed' ? 'เสร็จสิ้น' : 
                 project.status === 'Delayed' ? 'ล่าช้า' : project.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">งบประมาณ</p>
                <p className="text-xs font-black text-neutral-900 font-mono">{formatCurrency(project.budget)}</p>
              </div>
              <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">ผู้รับผิดชอบ</p>
                <p className="text-xs font-bold text-neutral-900 truncate">{project.responsiblePerson || project.supervisor || '-'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-neutral-400">ความก้าวหน้า</span>
                <span className="text-neutral-900">{project.progress}%</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  className={`h-full rounded-full ${
                    project.progress === 100 ? 'bg-green-500' : 
                    project.status === 'Delayed' ? 'bg-red-500' : 'bg-slate-900'
                  }`}
                />
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-neutral-100 flex justify-between items-center">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                อัปเดต: {format(new Date(project.updatedAt), 'dd/MM/yy HH:mm')}
              </span>
              <div className="flex items-center gap-1 text-orange-500 text-[10px] font-black uppercase tracking-widest">
                ดูรายละเอียด <Eye className="w-3 h-3" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredProjects.length === 0 && (
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

export default React.memo(ProjectTable);
