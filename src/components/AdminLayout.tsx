import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { ShieldCheck } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import ProjectManagement from './ProjectManagement';
import ProgressTracking from './ProgressTracking';
import ConstructionInspection from './ConstructionInspection';
import BudgetDisbursement from './BudgetDisbursement';
import DocumentManagement from './DocumentManagement';
import GISMapManagement from './GISMapManagement';
import ReportModule from './ReportModule';
import UserManagement from './UserManagement';
import BudgetImportList from './BudgetImportList';

const AdminLayout: React.FC = () => {
  const { logout, isAdmin, isDirector, isEngineer, isStaff } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'dashboard';

  if (!isStaff && !isEngineer && !isDirector && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-neutral-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-neutral-200 max-w-md">
          <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Access Denied</h1>
          <p className="text-neutral-500 mb-6">You do not have permission to access the admin backoffice. Please contact your administrator.</p>
          <button onClick={logout} className="px-6 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors">
            Logout
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AdminDashboard />;
      case 'projects': return <ProjectManagement />;
      case 'budget_import': return <BudgetImportList />;
      case 'progress': return <ProgressTracking />;
      case 'inspections': return <ConstructionInspection />;
      case 'budget': return <BudgetDisbursement />;
      case 'documents': return <DocumentManagement />;
      case 'gis': return <GISMapManagement />;
      case 'reports': return <ReportModule />;
      case 'users': return <UserManagement />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {renderContent()}
    </div>
  );
};

export default AdminLayout;
