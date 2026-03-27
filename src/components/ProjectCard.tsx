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
  Info
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
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          icon: <CheckCircle2 className="w-4 h-4" />,
          glow: 'shadow-emerald-500/20'
        };
      case 'Delayed':
        return {
          label: 'ล่าช้ากว่าแผน',
          color: 'text-rose-600',
          bgColor: 'bg-rose-50',
          borderColor: 'border-rose-200',
          icon: <AlertCircle className="w-4 h-4" />,
          glow: 'shadow-rose-500/20'
        };
      default:
        return {
          label: 'กำลังดำเนินการ',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          icon: <Clock className="w-4 h-4" />,
          glow: 'shadow-blue-500/20'
        };
    }
  };

  const statusInfo = getStatusInfo(project.status);

  const getTypeInfo = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('ถนน')) return { icon: <Construction className="w-4 h-4" />, label: 'งานทาง/ถนน', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    if (t.includes('ระบายน้ำ')) return { icon: <Droplets className="w-4 h-4" />, label: 'งานระบายน้ำ', color: 'text-sky-600', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' };
    if (t.includes('ไฟฟ้า')) return { icon: <Zap className="w-4 h-4" />, label: 'งานไฟฟ้า', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
    if (t.includes('อาคาร')) return { icon: <Building2 className="w-4 h-4" />, label: 'งานอาคาร', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' };
    return { icon: <HardHat className="w-4 h-4" />, label: type || 'ทั่วไป', color: 'text-neutral-600', bgColor: 'bg-neutral-50', borderColor: 'border-neutral-200' };
  };

  const typeInfo = getTypeInfo(project.type);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const lastUpdated = project.updatedAt ? formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true, locale: th }) : 'ไม่ระบุ';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      className="group bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-500 overflow-hidden flex flex-col h-full"
    >
      {/* Visual Header - Dynamic based on type */}
      <div className="h-32 relative overflow-hidden bg-neutral-900">
        <div className="absolute inset-0 opacity-40 group-hover:scale-110 transition-transform duration-700">
          <img 
            src={`https://picsum.photos/seed/${project.id}/800/400`} 
            alt={project.name}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
        </div>
        
        {/* Floating Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border ${typeInfo.bgColor}/80 ${typeInfo.borderColor} ${typeInfo.color} text-[10px] font-black uppercase tracking-widest shadow-lg`}>
            {typeInfo.icon}
            {typeInfo.label}
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 text-white group-hover:bg-orange-500 group-hover:border-orange-400 transition-all duration-300">
            <Info className="w-4 h-4" />
          </div>
        </div>

        <div className="absolute bottom-4 left-6 right-6 z-10">
          <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.3em] mb-1 block">
            PROJECT ID: {project.id}
          </span>
          <h3 className="text-white font-black text-lg leading-tight line-clamp-1 group-hover:text-orange-400 transition-colors">
            {project.name}
          </h3>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6 flex-1 flex flex-col space-y-6">
        {/* Status Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">สถานะปัจจุบัน</p>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.color} text-[11px] font-black uppercase tracking-wider shadow-sm ${statusInfo.glow}`}>
              {statusInfo.icon}
              {statusInfo.label}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1">ความก้าวหน้า</p>
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-4xl font-black text-neutral-900 tracking-tighter leading-none">{project.progress}</span>
              <span className="text-sm font-black text-neutral-400">%</span>
            </div>
          </div>
        </div>

        {/* Progress Visualization */}
        <div className="space-y-3">
          <div className="relative h-3 w-full bg-neutral-100 rounded-full overflow-hidden p-0.5 shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${project.progress}%` }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className={`h-full rounded-full relative overflow-hidden ${
                project.progress === 100 
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' 
                  : 'bg-gradient-to-r from-orange-400 to-orange-600'
              }`}
            >
              {project.progress > 0 && (
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-shimmer" />
              )}
            </motion.div>
          </div>
          <div className="flex justify-between items-center px-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((step) => (
                <div 
                  key={step} 
                  className={`h-1 w-6 rounded-full transition-colors duration-500 ${
                    project.progress >= step * 25 ? 'bg-orange-500' : 'bg-neutral-200'
                  }`} 
                />
              ))}
            </div>
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
              {project.progress === 100 ? 'เสร็จสมบูรณ์' : 'รอดำเนินการ'}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 group-hover:bg-white group-hover:border-orange-100 group-hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2 text-neutral-400 mb-2">
              <Wallet className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-widest">งบประมาณ</span>
            </div>
            <p className="text-sm font-black text-neutral-900">{formatCurrency(project.budget)}</p>
          </div>
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 group-hover:bg-white group-hover:border-orange-100 group-hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2 text-neutral-400 mb-2">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-widest">สถานที่</span>
            </div>
            <p className="text-sm font-black text-neutral-900 truncate">{project.locationName || 'ไม่ระบุ'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-neutral-100 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-neutral-900/20 group-hover:bg-orange-500 group-hover:shadow-orange-500/20 transition-all duration-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">ปีงบประมาณ</p>
              <p className="text-xs font-black text-neutral-900">{project.fiscalYear || '2569'}</p>
            </div>
          </div>
          <Link 
            to={`/projects/${project.id}`}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-orange-500 transition-all duration-300 shadow-xl shadow-neutral-900/10 hover:shadow-orange-500/20 active:scale-95"
          >
            ดูรายละเอียด
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(ProjectCard);
