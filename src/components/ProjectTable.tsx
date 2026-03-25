import React from 'react';
import { Project } from './Dashboard';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, MoreVertical, Search } from 'lucide-react';

interface ProjectTableProps {
  projects: Project[];
  isAdmin: boolean;
}

const ProjectTable: React.FC<ProjectTableProps> = ({ projects, isAdmin }) => {
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

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Project Name</th>
            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Type</th>
            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Budget</th>
            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Progress</th>
            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Last Updated</th>
            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-neutral-50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-bold text-neutral-900 group-hover:text-neutral-900">{project.name}</span>
                  <span className="text-xs text-neutral-400 font-mono">ID: {project.id}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-neutral-600">{project.type}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-mono font-bold text-neutral-900">${project.budget.toLocaleString()}</span>
              </td>
              <td className="px-6 py-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${getStatusColor(project.status)}`}>
                  {getStatusIcon(project.status)}
                  {project.status}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3 min-w-[120px]">
                  <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        project.progress === 100 ? 'bg-green-500' : 'bg-neutral-900'
                      }`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-neutral-900">{project.progress}%</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="text-xs text-neutral-500">
                  {format(new Date(project.updatedAt), 'MMM dd, yyyy HH:mm')}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                {isAdmin && (
                  <button className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
            <Search className="text-neutral-400 w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900">No projects found</h3>
          <p className="text-neutral-500 max-w-xs mx-auto mt-2">
            Try syncing data from Google Sheets or check back later.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectTable;
