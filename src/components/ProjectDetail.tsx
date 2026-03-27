import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, onSnapshot, collection, query, where, orderBy, updateDoc, storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Project } from './Dashboard';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { useAuth } from '../useAuth';
import { Skeleton } from './ui/Skeleton';
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
  Sparkles,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProjectMap from './ProjectMap';
import ProjectAI from './ProjectAI';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, canAccessAdmin } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Project>>({});

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  useEffect(() => {
    if (!projectId) return;

    const unsubscribeProject = onSnapshot(doc(db, 'projects', projectId), (doc) => {
      if (doc.exists()) {
        setProject({ ...doc.data(), id: doc.id } as Project);
        setLastUpdated(new Date());
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

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  const handleEditToggle = useCallback(() => {
    if (!isEditing && project) {
      setEditData({
        name: project.name,
        type: project.type,
        fiscalYear: project.fiscalYear,
        budget: project.budget,
        startDate: project.startDate,
        endDate: project.endDate,
        description: project.description,
        contractor: project.contractor,
        responsiblePerson: project.responsiblePerson,
        status: project.status,
        progress: project.progress
      });
    }
    setIsEditing(prev => !prev);
  }, [isEditing, project]);

  const handleRefresh = useCallback(async () => {
    if (!projectId) return;
    setIsRefreshing(true);
    try {
      const { getDocFromServer } = await import('firebase/firestore');
      const docSnap = await getDocFromServer(doc(db, 'projects', projectId));
      if (docSnap.exists()) {
        setProject({ ...docSnap.data(), id: docSnap.id } as Project);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [projectId]);

  const handleSave = useCallback(async () => {
    if (!projectId || !project) return;
    try {
      setLoading(true);
      await updateDoc(doc(db, 'projects', projectId), {
        ...editData,
        updatedAt: new Date().toISOString()
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, 'Error updating project');
    } finally {
      setLoading(false);
    }
  }, [projectId, project, editData]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId || !project) return;

    setUploadingImage(true);
    setImageUploadProgress(0);

    try {
      const fileRef = ref(storage, `projects/${projectId}/images/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setImageUploadProgress(progress);
        },
        (error) => {
          console.error('Upload failed', error);
          setUploadingImage(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const newImage = {
            url: downloadURL,
            name: file.name,
            uploadedAt: new Date().toISOString(),
            uploadedBy: user?.displayName || user?.email || 'Unknown'
          };
          
          await updateDoc(doc(db, 'projects', projectId), {
            images: [...(project.images || []), newImage],
            updatedAt: new Date().toISOString()
          });
          
          setUploadingImage(false);
          setImageUploadProgress(0);
        }
      );
    } catch (error) {
      console.error('Error starting upload', error);
      setUploadingImage(false);
    }
  }, [projectId, project, user]);

  const tabs = useMemo(() => [
    { id: 'general', label: 'ข้อมูลทั่วไป', icon: <Info className="w-4 h-4" /> },
    { id: 'images', label: 'รูปภาพ', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'gis', label: 'แผนที่ GIS', icon: <MapIcon className="w-4 h-4" /> },
    { id: 'docs', label: 'เอกสาร', icon: <FileText className="w-4 h-4" /> },
    { id: 'progress', label: 'ความคืบหน้า', icon: <Clock className="w-4 h-4" /> },
    { id: 'history', label: 'บันทึกการเปลี่ยนแปลง', icon: <History className="w-4 h-4" /> },
    { id: 'ai', label: 'ผู้ช่วย AI', icon: <Sparkles className="w-4 h-4" /> },
  ], []);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <div className="h-8 w-px bg-neutral-100 mx-2" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-12 w-32 rounded-xl" />
            <Skeleton className="h-12 w-32 rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm h-[600px]">
              <div className="flex border-b border-neutral-100 px-6">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-24 mx-2" />)}
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                </div>
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[400px] rounded-3xl" />
            <Skeleton className="h-[300px] rounded-3xl" />
          </div>
        </div>
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
              {isAdmin && (
                <button 
                  onClick={handleEditToggle}
                  className={`p-2 rounded-lg transition-all ${isEditing ? 'text-orange-600 bg-orange-50' : 'text-neutral-400 hover:text-orange-600 hover:bg-orange-50'}`}
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
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
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-900 rounded-xl font-bold hover:bg-neutral-200 transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  บันทึก
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-6 py-3 bg-neutral-100 text-neutral-900 rounded-xl font-bold hover:bg-neutral-200 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'กำลังรีเฟรช...' : 'ดึงข้อมูลล่าสุด'}
                </button>
                <button 
                  onClick={handleEditToggle}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                  แก้ไข
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {lastUpdated && (
        <div className="flex justify-end -mt-4 px-2">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            ซิงค์ข้อมูลล่าสุดเมื่อ: {format(lastUpdated, 'HH:mm:ss')}
          </p>
        </div>
      )}

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
                    className="p-6"
                  >
                    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden h-[450px] relative">
                      <ProjectMap projects={[project]} />
                      {project.googleMapsLink && (
                        <a 
                          href={project.googleMapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-neutral-200 shadow-xl flex items-center gap-2 text-xs font-bold text-neutral-900 hover:bg-white transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          เปิดใน Google Maps
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
                {activeTab === 'docs' && (
                  <motion.div
                    key="docs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-8 space-y-6"
                  >
                    <h3 className="text-lg font-black text-neutral-900 tracking-tight">เอกสารโครงการ</h3>
                    {project.attachments && project.attachments.length > 0 ? (
                      <div className="grid gap-4">
                        {project.attachments.map((doc: any, idx: number) => (
                          <a
                            key={idx}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 p-4 rounded-2xl border border-neutral-200 hover:border-orange-300 hover:bg-orange-50 transition-all group"
                          >
                            <File className="w-6 h-6 text-neutral-400 group-hover:text-orange-600" />
                            <div className="flex-1">
                              <p className="font-bold text-neutral-900 group-hover:text-orange-700">{doc.name || 'ไม่มีชื่อเอกสาร'}</p>
                              <p className="text-xs text-neutral-500">{doc.date || '-'}</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-neutral-400" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                        <FileText className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                        <p className="font-bold text-neutral-500">ไม่พบเอกสารในโครงการนี้</p>
                      </div>
                    )}
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {isEditing ? (
                        <>
                          <div className="col-span-2 md:col-span-3 space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">ชื่อโครงการ</label>
                            <input 
                              type="text" 
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                              value={editData.name || ''}
                              onChange={e => setEditData({...editData, name: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">ปีงบประมาณ</label>
                            <input 
                              type="text" 
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                              value={editData.fiscalYear || ''}
                              onChange={e => setEditData({...editData, fiscalYear: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">ประเภทโครงการ</label>
                            <select 
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                              value={editData.type || ''}
                              onChange={e => setEditData({...editData, type: e.target.value})}
                            >
                              <option>ถนน</option>
                              <option>รางระบายน้ำ</option>
                              <option>ท่อระบายน้ำ</option>
                              <option>ขยายไหล่ทาง</option>
                              <option>อาคาร</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">งบประมาณ (บาท)</label>
                            <input 
                              type="number" 
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                              value={editData.budget || 0}
                              onChange={e => setEditData({...editData, budget: Number(e.target.value)})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">วันที่เริ่มสัญญา</label>
                            <input 
                              type="date" 
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                              value={editData.startDate || ''}
                              onChange={e => setEditData({...editData, startDate: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">วันที่สิ้นสุดสัญญา</label>
                            <input 
                              type="date" 
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                              value={editData.endDate || ''}
                              onChange={e => setEditData({...editData, endDate: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">สถานะ</label>
                            <select 
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                              value={editData.status || ''}
                              onChange={e => setEditData({...editData, status: e.target.value})}
                            >
                              <option>In Progress</option>
                              <option>Completed</option>
                              <option>Delayed</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">ความก้าวหน้า (%)</label>
                            <input 
                              type="number" 
                              min="0"
                              max="100"
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                              value={editData.progress || 0}
                              onChange={e => setEditData({...editData, progress: Number(e.target.value)})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">ผู้รับเหมา</label>
                            <input 
                              type="text" 
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                              value={editData.contractor || ''}
                              onChange={e => setEditData({...editData, contractor: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">ผู้รับผิดชอบ</label>
                            <input 
                              type="text" 
                              className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                              value={editData.responsiblePerson || ''}
                              onChange={e => setEditData({...editData, responsiblePerson: e.target.value})}
                            />
                          </div>
                        </>
                      ) : (
                        [
                          { label: 'ปีงบประมาณ', value: project.fiscalYear || '-' },
                          { label: 'ประเภทโครงการ', value: project.type },
                          { label: 'งบประมาณ', value: formatCurrency(project.budget) },
                          { label: 'วันที่เริ่มสัญญา', value: project.startDate || '-' },
                          { label: 'วันที่สิ้นสุดสัญญา', value: project.endDate || '-' },
                        ].map((item, idx) => (
                          <div key={idx} className="bg-neutral-50 p-5 rounded-2xl border border-neutral-100">
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{item.label}</p>
                            <p className="text-sm font-bold text-neutral-900">{item.value}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-2">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">รายละเอียดโครงการ</p>
                      {isEditing ? (
                        <textarea 
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm"
                          rows={4}
                          value={editData.description || ''}
                          onChange={e => setEditData({...editData, description: e.target.value})}
                        />
                      ) : (
                        <p className="text-sm text-neutral-600 leading-relaxed">
                          {project.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                        </p>
                      )}
                    </div>

                    {/* Budget Breakdown Section */}
                    <div className="pt-6 border-t border-neutral-100">
                      <h3 className="text-base font-black text-neutral-900 tracking-tight mb-5">
                        รายละเอียดการจัดสรรงบประมาณ
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Total Budget Card */}
                        <div className="bg-neutral-900 p-6 rounded-2xl flex flex-col justify-center text-white">
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">งบประมาณรวม</p>
                          <p className="text-2xl font-black">{formatCurrency(project.budget)}</p>
                          <div className="mt-4 flex items-center justify-between text-xs">
                            <span className="font-bold text-neutral-400">ปีงบประมาณ</span>
                            <span className="font-black text-white">{project.fiscalYear || '2569'}</span>
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
                                    <p className="text-sm font-bold text-neutral-900">งวดที่ {phase.installment}</p>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                                      {format(new Date(phase.paymentDate), 'dd MMM yy')}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-neutral-900">{formatCurrency(phase.amount)}</p>
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
                {activeTab === 'images' && (
                  <motion.div
                    key="images"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-8 space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-neutral-900 tracking-tight">รูปภาพโครงการ</h3>
                      {canAccessAdmin && (
                        <div>
                          <input
                            type="file"
                            id="image-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                          <label
                            htmlFor="image-upload"
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm cursor-pointer transition-all ${
                              uploadingImage 
                                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
                                : 'bg-neutral-900 text-white hover:bg-neutral-800'
                            }`}
                          >
                            {uploadingImage ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                กำลังอัปโหลด {Math.round(imageUploadProgress)}%
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" />
                                อัปโหลดรูปภาพ
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>

                    {project.images && project.images.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {project.images.map((img: any, idx: number) => (
                          <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                            <img 
                              src={img.url} 
                              alt={img.name || `Project image ${idx + 1}`} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                              <p className="text-white text-xs font-bold truncate">{img.name}</p>
                              <p className="text-white/70 text-[10px]">{format(new Date(img.uploadedAt), 'dd MMM yyyy')}</p>
                            </div>
                            <a 
                              href={img.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white hover:scale-110"
                            >
                              <ExternalLink className="w-4 h-4 text-neutral-900" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                        <ImageIcon className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                        <p className="font-bold text-neutral-500">ยังไม่มีรูปภาพในโครงการนี้</p>
                        {canAccessAdmin && (
                          <p className="text-xs text-neutral-400 mt-2">คลิกปุ่มด้านบนเพื่ออัปโหลดรูปภาพ</p>
                        )}
                      </div>
                    )}
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
                {['progress', 'history'].includes(activeTab) && (
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
                  <p className="font-bold text-neutral-900">{project.contractNo || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">คณะกรรมการตรวจรับ</p>
                  <p className="font-bold text-neutral-900">
                    {project.inspectionCommittee?.join(', ') || '-'}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ผู้รับจ้าง</p>
                  <p className="font-bold text-neutral-900">{project.contractor || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ผู้ควบคุมงาน</p>
                  <p className="font-bold text-neutral-900">{project.supervisor || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-6">
          {/* Calendar View */}
          {(project.startDate || project.endDate) && (
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-4">
              <h3 className="font-black text-neutral-900 tracking-tight flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                ระยะเวลาโครงการ
              </h3>
              <div className="flex justify-center">
                <DayPicker
                  mode="range"
                  selected={{
                    from: project.startDate ? parseISO(project.startDate) : undefined,
                    to: project.endDate ? parseISO(project.endDate) : undefined
                  }}
                  modifiers={{
                    start: project.startDate ? parseISO(project.startDate) : undefined,
                    end: project.endDate ? parseISO(project.endDate) : undefined
                  }}
                  modifiersStyles={{
                    start: { backgroundColor: '#f97316', color: 'white', fontWeight: 'bold' },
                    end: { backgroundColor: '#f97316', color: 'white', fontWeight: 'bold' }
                  }}
                  className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100"
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-neutral-500 px-2">
                <div className="flex flex-col items-center">
                  <span className="uppercase tracking-widest text-[10px] text-neutral-400">เริ่มต้น</span>
                  <span className="text-neutral-900">{project.startDate ? format(parseISO(project.startDate), 'dd MMM yyyy') : '-'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="uppercase tracking-widest text-[10px] text-neutral-400">สิ้นสุด</span>
                  <span className="text-neutral-900">{project.endDate ? format(parseISO(project.endDate), 'dd MMM yyyy') : '-'}</span>
                </div>
              </div>
            </div>
          )}

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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        item.status === 'Paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {item.status === 'Paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
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
              {(project.attachments || []).map((file: any, idx: number) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name || '');
                return (
                  <div key={idx} className="flex items-center gap-4 p-3 hover:bg-neutral-50 rounded-2xl border border-transparent hover:border-neutral-100 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-500 overflow-hidden">
                      {isImage ? (
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <File className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 truncate group-hover:text-blue-600 transition-colors">{file.name || 'ไฟล์แนบ'}</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">
                        {file.size || 'N/A'} • {file.date || '-'}
                      </p>
                    </div>
                  </div>
                );
              })}
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
