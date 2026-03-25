import React from 'react';
import { Project } from './Dashboard';
import { LayoutGrid, DollarSign, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface SummaryCardsProps {
  projects: Project[];
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ projects }) => {
  const totalProjects = projects.length;
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const completedProjects = projects.filter((p) => p.status === 'Completed').length;
  const inProgressProjects = projects.filter((p) => p.status === 'In Progress').length;
  const delayedProjects = projects.filter((p) => p.status === 'Delayed').length;

  const stats = [
    {
      label: 'Total Projects',
      value: totalProjects,
      icon: LayoutGrid,
      color: 'bg-neutral-900',
      textColor: 'text-white',
    },
    {
      label: 'Total Budget',
      value: `$${(totalBudget / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      color: 'bg-white',
      textColor: 'text-neutral-900',
      border: 'border border-neutral-200',
    },
    {
      label: 'Completed',
      value: completedProjects,
      icon: CheckCircle2,
      color: 'bg-green-50',
      textColor: 'text-green-700',
      border: 'border border-green-200',
    },
    {
      label: 'In Progress',
      value: inProgressProjects,
      icon: Clock,
      color: 'bg-blue-50',
      textColor: 'text-blue-700',
      border: 'border border-blue-200',
    },
    {
      label: 'Delayed',
      value: delayedProjects,
      icon: AlertCircle,
      color: 'bg-red-50',
      textColor: 'text-red-700',
      border: 'border border-red-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`${stat.color} ${stat.textColor} ${stat.border || ''} p-6 rounded-2xl shadow-sm flex flex-col justify-between transition-transform hover:scale-[1.02]`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">{stat.label}</span>
            <stat.icon className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-3xl font-black tracking-tight">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
