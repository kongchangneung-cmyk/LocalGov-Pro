import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, onSnapshot, collection, query, where, orderBy } from '../firebase';
import { Project } from './Dashboard';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { useAuth } from '../useAuth';
import { 
  ArrowLeft, 
  Edit2, 
  Map as MapIcon, 
  FileText, 
  Clock, 
  History, 
  Info, 
  ExternalLink, 
  File, 
  Plus,
  CheckCircle2,
  Circle,
  Wallet,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProjectMap from './ProjectMap';
import ProjectAI from './ProjectAI';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, canAccessAdmin } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (!projectId) return;

    const unsubscribeProject = onSnapshot(doc(db, 'projects', projectId), (doc) => {
      if (doc.exists()) {
        setProject({ ...doc.data(), id: doc.id } as Project);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'Error loading project detail');
      setLoading(false);
    });

    const qDisbursements = query(
      collection(db, 'disbursements'), 
      where('projectId', '==', projectId),
      orderBy('paymentDate', 'desc')
    );
    
    const unsubscribeDisbursements = onSnapshot(qDisbursements, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id });
      });
      setDisbursements(data);
    }, (error) => {
      console.error('Error loading disbursements:', error);
    });

    return () => {
      unsubscribeProject();
      unsubscribeDisbursements();
    };
  }, [projectId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-neutral-400">ไม่พบข้อมูลโครงการ</h2>
        <button 
          onClick={() => navigate(-1)}
          className="mt-4 text-neutral-900 font-bold hover:underline"
        >
          กลับไปหน้าก่อนหน้า
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'ข้อมูลทั่วไป', icon: <Info className="w-4 h-4" /> },
    { id: 'gis', label: 'แผนที่ GIS', icon: <MapIcon className="w-4 h-4" /> },
    { id: 'docs', label: 'เอกสารแนบ', icon: <FileText className="w-4 h-4" /> },
    { id: 'progress', label: 'ความคืบหน้า', icon: <Clock className="w-4 h-4" /> },
    { id: 'history', label: 'บันทึกการเปลี่ยนแปลง', icon: <History className="w-4 h-4" /> },
    { id: 'ai', label: 'ผู้ช่วย AI', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm font-bold">
        {canAccessAdmin ? (
          <>
            <Link to="/admin" className="text-neutral-400 hover:text-neutral-900 transition-colors">
              Admin
            </Link>
            <ChevronRight className="w-4 h-4 text-neutral-300" />
            <Link to="/admin/manage?tab=projects" className="text-neutral-400 hover:text-neutral-900 transition-colors">
              Projects
            </Link>
          </>
        ) : (
          <>
            <Link to="/" className="text-neutral-400 hover:text-neutral-900 transition-colors">
              Public Dashboard
            </Link>
          </>
        )}
        <ChevronRight className="w-4 h-4 text-neutral-300" />
        <span className="text-orange-500 truncate max-w-[200px]">
          {project.name}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(canAccessAdmin ? '/admin' : '/')}
            className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-100 rounded-xl transition-all group border border-transparent hover:border-neutral-200"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
            <span className="text-sm font-bold text-neutral-500 group-hover:text-neutral-900">กลับหน้าหลัก</span>
          </button>
          <div className="h-8 w-px bg-neutral-100 mx-2" />
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                {project.id}: {project.name}
              </h2>
              <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                {project.status === 'In Progress' ? 'กำลังดำเนินการ' : project.status}
              </div>
            </div>
            <p className="text-sm text-neutral-500 font-medium mt-1">
              หมู่ {project.villageNo || '-'} ต.{project.villageName || 'ในเมือง'} • งบประมาณ {project.fiscalYear || '2569'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all">
            <Edit2 className="w-4 h-4" />
            แก้ไข
          </button>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tabs & Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
            {/* Tabs Header */}
            <div className="flex items-center border-b border-neutral-100 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-5 text-sm font-bold transition-all relative ${
                    activeTab === tab.id ? 'text-orange-500' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-0 min-h-[400px]">
              <AnimatePresence mode="wait">
                {activeTab === 'gis' && (
                  <motion.div
                    key="gis"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-[500px]"
                  >
                    <ProjectMap projects={[project]} />
                  </motion.div>
                )}
                {activeTab === 'general' && (
                  <motion.div
                    key="general"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-8 space-y-8"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ปีงบประมาณ</p>
                        <p className="text-lg font-bold text-neutral-900">{project.fiscalYear || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ประเภทโครงการ</p>
                        <p className="text-lg font-bold text-neutral-900">{project.type}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">งบประมาณ</p>
                        <p className="text-lg font-bold text-neutral-900">{formatCurrency(project.budget)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">วันที่เริ่มสัญญา</p>
                        <p className="text-lg font-bold text-neutral-900">{project.startDate || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">วันที่สิ้นสุดสัญญา</p>
                        <p className="text-lg font-bold text-neutral-900">{project.endDate || '-'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">รายละเอียดโครงการ</p>
                      <p className="text-neutral-600 leading-relaxed">
                        {project.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                      </p>
                    </div>

                    {/* Budget Breakdown Section */}
                    <div className="pt-8 border-t border-neutral-100">
                      <h3 className="text-lg font-black text-neutral-900 tracking-tight mb-6">
                        รายละเอียดการจัดสรรงบประมาณ (Budget Breakdown)
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Total Budget Card */}
                        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 flex flex-col justify-center">
                          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">งบประมาณรวมทั้งสิ้น</p>
                          <p className="text-3xl font-black text-neutral-900">{formatCurrency(project.budget)}</p>
                          <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="font-bold text-neutral-500">ปีงบประมาณ</span>
                            <span className="font-black text-neutral-900">{project.fiscalYear || '2569'}</span>
                          </div>
                        </div>

                        {/* Breakdown by Phase */}
                        <div className="md:col-span-2 space-y-3">
                          {disbursements.length > 0 ? (
                            disbursements.map((phase, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-neutral-100 bg-white hover:border-orange-200 hover:shadow-sm transition-all group">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                                    <Wallet className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-neutral-900">งวดที่ {phase.installment}</p>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                                      เบิกจ่ายเมื่อ {format(new Date(phase.paymentDate), 'dd MMM yy')}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-neutral-900">{formatCurrency(phase.amount)}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                              <p className="text-xs text-neutral-400 font-medium">ยังไม่มีบันทึกการเบิกจ่าย</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                {activeTab === 'ai' && (
                  <motion.div
                    key="ai"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ProjectAI projectId={project.id} />
                  </motion.div>
                )}
                {/* Other tabs placeholders */}
                {['docs', 'progress', 'history'].includes(activeTab) && (
                  <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                    <FileText className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-bold">กำลังพัฒนาส่วนนี้</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Contract Info Section (Bottom) */}
          <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-neutral-900 tracking-tight">ข้อมูลสัญญาจ้าง</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">เลขที่สัญญา</p>
                  <p className="font-bold text-neutral-900">{project.contractNo || 'CN-69/015'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">คณะกรรมการตรวจรับ</p>
                  <p className="font-bold text-neutral-900">
                    {project.inspectionCommittee?.join(', ') || 'นายสมชาย, นายวิชัย, นายสมศักดิ์'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ผู้รับจ้าง</p>
                  <p className="font-bold text-neutral-900">{project.contractor || 'บริษัท เอ.บี.ซี คอนสตรัคชั่น จำกัด'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ผู้ควบคุมงาน</p>
                  <p className="font-bold text-neutral-900">{project.supervisor || 'นายช่างโยธา ชำนาญงาน'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-6">
          {/* Installments Timeline */}
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-neutral-900 tracking-tight">ไทม์ไลน์การเบิกจ่าย</h3>
                <span className="text-xs font-bold text-neutral-900 tracking-widest uppercase">ความก้าวหน้า {project.progress}%</span>
              </div>
              <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full shadow-sm ${
                    project.progress === 100 ? 'bg-green-500' : 
                    project.progress > 70 ? 'bg-blue-500' :
                    project.progress > 30 ? 'bg-orange-500' : 'bg-neutral-400'
                  }`}
                />
              </div>
            </div>
            <div className="relative pl-4 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-100">
              {disbursements.length > 0 ? (
                disbursements.map((item, idx) => (
                  <div key={idx} className="relative flex flex-col gap-1">
                    <div className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${
                      item.status === 'Paid' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <div className="flex items-center justify-between">
                      <p className="font-black text-sm text-neutral-900">
                        งวดที่ {item.installment}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'Paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {item.status === 'Paid' ? 'เบิกจ่ายแล้ว' : 'รอดำเนินการ'}
                      </span>
                    </div>
                    <div className="flex items-end justify-between mt-1">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {format(new Date(item.paymentDate), 'dd MMM yyyy')}
                        </span>
                      </div>
                      <p className="text-sm font-black text-neutral-900">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                    {item.note && (
                      <p className="text-[10px] text-neutral-500 mt-1 italic">
                        * {item.note}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 -ml-4">
                  <p className="text-xs text-neutral-400 font-medium">ยังไม่มีบันทึกการเบิกจ่าย</p>
                </div>
              )}
            </div>
          </div>

          {/* Attachments (Google Drive) */}
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-neutral-900 tracking-tight">ไฟล์แนบ (Google Drive)</h3>
              <button className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                เปิดโฟลเดอร์
              </button>
            </div>
            <div className="space-y-3">
              {(project.attachments || []).map((file: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 p-3 hover:bg-neutral-50 rounded-2xl border border-transparent hover:border-neutral-100 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-500">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-900 truncate group-hover:text-blue-600 transition-colors">{file.name || 'ไฟล์แนบ'}</p>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                      {file.size || 'N/A'} • {file.date || '-'}
                    </p>
                  </div>
                </div>
              ))}
              {(!project.attachments || project.attachments.length === 0) && (
                <div className="text-center py-8 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                  <p className="text-xs text-neutral-400 font-medium">ไม่มีไฟล์แนบ</p>
                </div>
              )}
              <button className="w-full py-3 border-2 border-dashed border-neutral-100 rounded-2xl flex items-center justify-center gap-2 text-neutral-400 hover:bg-neutral-50 hover:border-neutral-200 transition-all">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-bold">เพิ่มไฟล์</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Back Button */}
      <div className="flex justify-center pt-6 pb-12">
        <button 
          onClick={() => navigate(canAccessAdmin ? '/admin' : '/')}
          className="flex items-center gap-3 px-8 py-4 bg-white text-neutral-900 rounded-2xl font-bold border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 shadow-sm transition-all group"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
          กลับสู่หน้าแดชบอร์ด
        </button>
      </div>
    </div>
  );
};

export default ProjectDetail;
