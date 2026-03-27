import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from './Dashboard';
import { 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Wallet, 
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Construction,
  Droplets,
  Zap,
  Building2,
  HardHat,
  Info,
  Phone
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Completed':
        return {
          label: 'ดำเนินการแล้วเสร็จ',
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-100',
          icon: <CheckCircle2 className="w-4 h-4" />
        };
      case 'Delayed':
        return {
          label: 'ล่าช้ากว่าแผน',
          color: 'text-rose-500',
          bgColor: 'bg-rose-50',
          borderColor: 'border-rose-100',
          icon: <AlertCircle className="w-4 h-4" />
        };
      default:
        return {
          label: 'กำลังดำเนินการ',
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-100',
          icon: <Clock className="w-4 h-4" />
        };
    }
  };

  const statusInfo = getStatusInfo(project.status);

  const getTypeInfo = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('ถนน')) return { icon: <Construction className="w-4 h-4" />, label: 'งานทาง/ถนน', color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
    if (t.includes('ระบายน้ำ')) return { icon: <Droplets className="w-4 h-4" />, label: 'งานระบายน้ำ', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
    if (t.includes('ไฟฟ้า')) return { icon: <Zap className="w-4 h-4" />, label: 'งานไฟฟ้า', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
    if (t.includes('อาคาร')) return { icon: <Building2 className="w-4 h-4" />, label: 'งานอาคาร', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' };
    return { icon: <HardHat className="w-4 h-4" />, label: type || 'ทั่วไป', color: 'text-neutral-500', bgColor: 'bg-neutral-500/10' };
  };

  const typeInfo = getTypeInfo(project.type);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const lastUpdated = project.updatedAt ? formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true, locale: th }) : 'ไม่ระบุ';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group bg-white rounded-[2rem] border border-neutral-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full"
    >
      {/* Card Header - Navy Blue Theme */}
      <div className="bg-[#0f172a] p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full -ml-12 -mb-12 blur-2xl" />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1.5 flex-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                ID: {project.id}
              </span>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-[9px] font-bold uppercase tracking-wider ${typeInfo.color}`}>
                {typeInfo.icon}
                <span className="text-white/80">{typeInfo.label}</span>
              </div>
            </div>
            <h3 className="text-white font-black text-base leading-tight line-clamp-2 group-hover:text-orange-400 transition-colors mt-2">
              {project.name}
            </h3>
            <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 mt-2">
              <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
              <span>อัปเดต{lastUpdated}</span>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
            <TrendingUp className="text-orange-500 w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col space-y-5">
        {/* Status & Progress */}
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-[0.2em]">สถานะปัจจุบัน</p>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.color} text-[10px] font-black uppercase tracking-wider shadow-sm`}>
              {statusInfo.icon}
              {statusInfo.label}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-0.5">
              <span className="text-3xl font-black text-[#0f172a] tracking-tighter">{project.progress}</span>
              <span className="text-sm font-black text-[#0f172a]/40">%</span>
            </div>
            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">ความก้าวหน้าโครงการ</p>
          </div>
        </div>

        {/* Progress Bar - Enhanced */}
        <div className="relative">
          <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden shadow-inner p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${project.progress}%` }}
              transition={{ duration: 1.2, ease: "circOut" }}
              className={`h-full rounded-full relative ${
                project.progress === 100 
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' 
                  : 'bg-gradient-to-r from-orange-400 to-orange-600'
              } shadow-[0_0_10px_rgba(249,115,22,0.3)]`}
            >
              {project.progress > 10 && project.progress < 100 && (
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-shimmer" />
              )}
            </motion.div>
          </div>
          {/* Progress Markers */}
          <div className="absolute top-full mt-1 w-full flex justify-between px-0.5">
            {[0, 25, 50, 75, 100].map(mark => (
              <div key={mark} className="flex flex-col items-center">
                <div className={`w-0.5 h-1 rounded-full ${project.progress >= mark ? 'bg-orange-500/40' : 'bg-neutral-200'}`} />
                <span className="text-[6px] font-bold text-neutral-300 mt-0.5">{mark}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info Grid - Modernized */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-neutral-50/50 p-3 rounded-2xl border border-neutral-100/50 group-hover:bg-white group-hover:shadow-sm transition-all">
            <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
              <Wallet className="w-3 h-3" />
              <span className="text-[8px] font-bold uppercase tracking-widest">งบประมาณ</span>
            </div>
            <p className="text-xs font-black text-[#0f172a]">{formatCurrency(project.budget)}</p>
          </div>
          <div className="bg-neutral-50/50 p-3 rounded-2xl border border-neutral-100/50 group-hover:bg-white group-hover:shadow-sm transition-all">
            <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
              <MapPin className="w-3 h-3" />
              <span className="text-[8px] font-bold uppercase tracking-widest">สถานที่</span>
            </div>
            <p className="text-xs font-black text-[#0f172a] line-clamp-1">{project.locationName || 'ไม่ระบุ'}</p>
          </div>
        </div>

        {/* Contractor Info */}
        <div className="bg-neutral-50/50 p-3 rounded-2xl border border-neutral-100/50 group-hover:bg-white group-hover:shadow-sm transition-all">
          <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
            <HardHat className="w-3 h-3" />
            <span className="text-[8px] font-bold uppercase tracking-widest">ผู้รับเหมา</span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs font-black text-[#0f172a] line-clamp-1">{project.contractor || 'ไม่ระบุ'}</p>
            {project.contractorPhone && (
              <a 
                href={`tel:${project.contractorPhone}`} 
                className="text-[10px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3 h-3" />
                {project.contractorPhone}
              </a>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-neutral-900/10">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[7px] font-bold text-neutral-400 uppercase tracking-[0.2em]">ปีงบประมาณ</p>
              <p className="text-[11px] font-black text-[#0f172a]">{project.fiscalYear || '2569'}</p>
            </div>
          </div>
          <Link 
            to={`/projects/${project.id}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#0f172a] transition-all shadow-lg shadow-orange-500/20 hover:shadow-[#0f172a]/20 active:scale-95"
          >
            รายละเอียด
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(ProjectCard);
