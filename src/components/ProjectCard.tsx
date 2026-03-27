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
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group bg-white rounded-[2rem] border border-neutral-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full"
    >
      {/* Card Header - Navy Blue Theme */}
      <div className="bg-[#0f172a] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Project ID: {project.id}</span>
            <h3 className="text-white font-black text-lg leading-tight line-clamp-2 group-hover:text-orange-400 transition-colors">
              {project.name}
            </h3>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
            <TrendingUp className="text-orange-500 w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 flex-1 flex flex-col space-y-6">
        {/* Status & Progress */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.color} text-[10px] font-black uppercase tracking-wider`}>
            {statusInfo.icon}
            {statusInfo.label}
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-[#0f172a]">{project.progress}%</span>
            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">ความก้าวหน้า</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${project.progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${project.progress === 100 ? 'bg-emerald-500' : 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]'}`}
          />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Wallet className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase tracking-widest">งบประมาณ</span>
            </div>
            <p className="text-sm font-black text-[#0f172a]">{formatCurrency(project.budget)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <MapPin className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase tracking-widest">ประเภทงาน</span>
            </div>
            <p className="text-sm font-black text-[#0f172a]">{project.type}</p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-4 border-t border-neutral-50 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-50 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-neutral-400" />
            </div>
            <div>
              <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">ปีงบประมาณ</p>
              <p className="text-[10px] font-black text-[#0f172a]">{project.fiscalYear || '2569'}</p>
            </div>
          </div>
          <Link 
            to={`/projects/${project.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0f172a] transition-all shadow-lg shadow-orange-500/20 hover:shadow-[#0f172a]/20"
          >
            ดูรายละเอียด
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
