import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { db, collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from '../firebase';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { Project } from './Dashboard';
import { notifyProjectDelay, notifyProjectUpdate } from '../utils/notificationService';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye, 
  Database,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Calendar,
  User,
  X,
  CheckSquare,
  Square,
  ChevronDown,
  LayoutGrid,
  List
} from 'lucide-react';
import { format } from 'date-fns';
import ProjectCard from './ProjectCard';
import ProjectMap from './ProjectMap';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectManagementProps {
  typeFilter?: string;
  title?: string;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ typeFilter, title }) => {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'map'>('grid');
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: typeFilter || 'ถนน',
    fiscalYear: '2569',
    budget: 0,
    contractor: '',
    startDate: '',
    endDate: '',
    status: 'In Progress',
    progress: 0,
    lat: 16.05,
    lng: 103.65,
    responsiblePerson: ''
  });

  useEffect(() => {
    if (!user) return;

    let q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData: Project[] = [];
      snapshot.forEach((doc) => {
        const data = { ...doc.data(), id: doc.id } as Project;
        // Apply type filter if provided
        if (!typeFilter || data.type === typeFilter || (typeFilter === 'โครงสร้างพื้นฐาน' && ['ถนน', 'รางระบายน้ำ', 'ท่อระบายน้ำ'].includes(data.type))) {
          projectsData.push(data);
        }
      });
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'Error loading projects');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, typeFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.budget <= 0) {
      setBudgetError('งบประมาณต้องเป็นตัวเลขที่มากกว่า 0');
      return;
    }
    
    setBudgetError(null);

    try {
      const data = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      if (editingProject) {
        const statusChanged = formData.status !== editingProject.status;
        const progressChanged = formData.progress !== editingProject.progress;

        await updateDoc(doc(db, 'projects', editingProject.id), data);
        
        // Trigger notifications for relevant users
        if (statusChanged) {
          await notifyProjectUpdate(formData.name, editingProject.id, 'status', formData.status);
        }
        if (progressChanged && !statusChanged) {
          await notifyProjectUpdate(formData.name, editingProject.id, 'progress', formData.progress);
        }
      } else {
        const docRef = await addDoc(collection(db, 'projects'), {
          ...data,
          id: `PROJ-${Date.now()}`
        });

        // Trigger notification if new project is already Delayed
        if (formData.status === 'Delayed' && user) {
          await notifyProjectDelay(user.uid, formData.name, docRef.id);
        }
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('คุณต้องการลบโครงการนี้ใช่หรือไม่?')) {
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: typeFilter || 'ถนน',
      fiscalYear: '2569',
      budget: 0,
      contractor: '',
      startDate: '',
      endDate: '',
      status: 'In Progress',
      progress: 0,
      lat: 16.05,
      lng: 103.65,
      responsiblePerson: ''
    });
    setEditingProject(null);
    setBudgetError(null);
  };

  const handleSyncGoogleSheet = async () => {
    const sheetId = prompt('กรุณาใส่ Google Sheet ID (ต้องเปิดเป็นสาธารณะ/Public):', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    if (!sheetId) return;

    try {
      setLoading(true);
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch sheet');
      
      const csvText = await response.text();
      
      // Basic CSV parsing
      const rows = csvText.split('\n').map(row => {
        // Handle commas inside quotes
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });

      if (rows.length < 2) {
        alert('ไม่พบข้อมูลใน Google Sheet');
        return;
      }

      const headers = rows[0].map(h => h.replace(/"/g, '').trim());
      const batch = writeBatch(db);
      
      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        if (values.length < headers.length || !values[0]) continue;
        
        const projectData: any = {};
        headers.forEach((header, index) => {
          projectData[header] = values[index];
        });

        const mappedProject = {
          name: projectData.name || projectData['ชื่อโครงการ'] || 'Untitled',
          type: projectData.type || projectData['ประเภท'] || 'ถนน',
          budget: Number(projectData.budget || projectData['งบประมาณ'] || 0),
          status: projectData.status || projectData['สถานะ'] || 'In Progress',
          progress: Number(projectData.progress || projectData['ความก้าวหน้า'] || 0),
          lat: Number(projectData.lat || 16.05),
          lng: Number(projectData.lng || 103.65),
          updatedAt: new Date().toISOString(),
          contractor: projectData.contractor || projectData['ผู้รับเหมา'] || '',
          responsiblePerson: projectData.responsiblePerson || projectData['ผู้รับผิดชอบ'] || '',
          fiscalYear: projectData.fiscalYear || '2569'
        };

        const docRef = doc(collection(db, 'projects'));
        batch.set(docRef, { ...mappedProject, id: `PROJ-${docRef.id.substr(0, 5).toUpperCase()}` });
        count++;
      }
      
      await batch.commit();
      alert(`ซิงค์ข้อมูลสำเร็จ! นำเข้าทั้งหมด ${count} รายการ`);
    } catch (error) {
      console.error('Sync error:', error);
      alert('เกิดข้อผิดพลาดในการซิงค์ข้อมูล: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const clearAllProjects = async () => {
    if (!window.confirm('คุณต้องการลบโครงการทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    
    try {
      setLoading(true);
      const batch = writeBatch(db);
      projects.forEach(p => {
        batch.delete(doc(db, 'projects', p.id));
      });
      await batch.commit();
      alert('ลบข้อมูลโครงการทั้งหมดเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error clearing projects:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleImportBudget = async () => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/import-budget', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();
      
      const batch = writeBatch(db);
      const importDate = new Date().toISOString();

      result.data.forEach((item: any) => {
        const importRef = doc(collection(db, 'budget_imports'));
        batch.set(importRef, {
          ...item,
          importDate,
          id: importRef.id
        });
      });

      await batch.commit();
      alert(`Successfully imported ${result.data.length} budget records`);
    } catch (error) {
      console.error('Import error:', error);
      alert(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`คุณต้องการลบ ${selectedIds.length} โครงการที่เลือกใช่หรือไม่?`)) return;

    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'projects', id));
      });
      await batch.commit();
      setSelectedIds([]);
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูลแบบกลุ่ม');
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, 'projects', id), { 
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      
      // Notify relevant users for each project that changed status
      for (const id of selectedIds) {
        const project = projects.find(p => p.id === id);
        if (project && project.status !== newStatus) {
          await notifyProjectUpdate(project.name, id, 'status', newStatus);
        }
      }
      
      setSelectedIds([]);
    } catch (error) {
      console.error('Error bulk updating status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะแบบกลุ่ม');
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
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{title || 'จัดการโครงการ'}</h2>
          {typeFilter && <p className="text-sm text-neutral-500 font-medium">หมวดหมู่: {typeFilter}</p>}
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1 max-w-2xl justify-end">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="ค้นหาโครงการ..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-neutral-100 p-1 rounded-xl mr-2">
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                <MapPin className="w-5 h-5" />
              </button>
            </div>
            {isAdmin && !typeFilter && (
              <>
                <button 
                  onClick={handleSyncGoogleSheet}
                  className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold hover:bg-green-100 transition-all"
                >
                  <Database className="w-5 h-5" />
                  Sync All
                </button>
                <button 
                  onClick={clearAllProjects}
                  className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                  ลบทั้งหมด
                </button>
              </>
            )}
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-900/20 transition-all whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              เพิ่มโครงการ
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {['All', 'In Progress', 'Completed', 'Delayed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              statusFilter === status 
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' 
                : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {status === 'All' ? 'ทั้งหมด' : status}
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-neutral-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-black">
              {selectedIds.length} SELECTED
            </div>
            <p className="text-sm font-bold text-white/80">จัดการโครงการที่เลือก</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center bg-white/10 hover:bg-white/20 rounded-xl transition-all">
              <select
                className="appearance-none bg-transparent pl-4 pr-10 py-2 text-sm font-bold text-white outline-none cursor-pointer w-full"
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value);
                    e.target.value = ''; // reset after selection
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled className="text-neutral-900">เปลี่ยนสถานะ...</option>
                <option value="In Progress" className="text-neutral-900">In Progress</option>
                <option value="Completed" className="text-neutral-900">Completed</option>
                <option value="Delayed" className="text-neutral-900">Delayed</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 pointer-events-none text-white/70" />
            </div>
            
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-bold transition-all"
            >
              <Trash2 className="w-4 h-4" />
              ลบที่เลือก
            </button>
            
            <button 
              onClick={() => setSelectedIds([])}
              className="p-2 text-white/40 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Project List */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div 
            key="table"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800">
                    <th className="px-6 py-4 w-12">
                      <button 
                        onClick={toggleSelectAll}
                        className="text-slate-400 hover:text-white transition-all"
                      >
                        {selectedIds.length === filteredProjects.length && filteredProjects.length > 0 ? (
                          <CheckSquare className="w-5 h-5 text-orange-500" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">โครงการ</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">งบประมาณ</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">สถานะ</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">ความก้าวหน้า</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredProjects.map((project) => (
                    <tr 
                      key={project.id} 
                      className={`hover:bg-neutral-50 transition-colors group ${selectedIds.includes(project.id) ? 'bg-orange-50/50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => toggleSelect(project.id)}
                          className="text-neutral-400 hover:text-orange-600 transition-all"
                        >
                          {selectedIds.includes(project.id) ? (
                            <CheckSquare className="w-5 h-5 text-orange-500" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900 group-hover:text-neutral-900 line-clamp-1">{project.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded font-mono">{project.id}</span>
                            <span className="text-[10px] text-neutral-400">{project.type}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-neutral-900">{formatCurrency(project.budget)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden min-w-[80px]">
                            <div 
                              className={`h-full rounded-full ${project.progress === 100 ? 'bg-green-500' : 'bg-slate-900'}`}
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-neutral-900">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/projects/${project.id}`}
                            className="p-2 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => { 
                              setEditingProject(project); 
                              setFormData({
                                name: project.name,
                                type: project.type,
                                fiscalYear: project.fiscalYear,
                                budget: project.budget,
                                contractor: project.contractor,
                                startDate: project.startDate,
                                endDate: project.endDate,
                                status: project.status,
                                progress: project.progress,
                                lat: project.lat,
                                lng: project.lng,
                                responsiblePerson: project.responsiblePerson
                              }); 
                              setIsModalOpen(true); 
                            }}
                            className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(project.id)}
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Search className="text-neutral-300 w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-neutral-900 tracking-tight">ไม่พบข้อมูลโครงการ</h3>
                  <p className="text-neutral-500 max-w-xs mx-auto mt-2 mb-8 font-medium">
                    ไม่พบรายการโครงการที่ตรงตามเงื่อนไข หรือยังไม่มีข้อมูลในระบบ
                  </p>
                  <button 
                    onClick={handleSyncGoogleSheet}
                    className="flex items-center gap-2 px-8 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all active:scale-95"
                  >
                    <Database className="w-5 h-5" />
                    Sync All
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredProjects.map((project) => (
              <div key={project.id} className="relative group">
                <div className="absolute top-4 left-4 z-10">
                  <button 
                    onClick={() => toggleSelect(project.id)}
                    className={`p-2 rounded-xl transition-all ${selectedIds.includes(project.id) ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/80 backdrop-blur-md text-neutral-400 hover:text-neutral-900 border border-white/20 opacity-0 group-hover:opacity-100'}`}
                  >
                    {selectedIds.includes(project.id) ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => { 
                      setEditingProject(project); 
                      setFormData({
                        name: project.name,
                        type: project.type,
                        fiscalYear: project.fiscalYear,
                        budget: project.budget,
                        contractor: project.contractor,
                        startDate: project.startDate,
                        endDate: project.endDate,
                        status: project.status,
                        progress: project.progress,
                        lat: project.lat,
                        lng: project.lng,
                        responsiblePerson: project.responsiblePerson
                      }); 
                      setIsModalOpen(true); 
                    }}
                    className="p-2 bg-white/80 backdrop-blur-md text-blue-600 rounded-xl border border-white/20 shadow-lg hover:bg-white transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(project.id)}
                    className="p-2 bg-white/80 backdrop-blur-md text-red-600 rounded-xl border border-white/20 shadow-lg hover:bg-white transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <ProjectCard project={project} />
              </div>
            ))}
            {filteredProjects.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-neutral-200 border-dashed">
                <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Search className="text-neutral-300 w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-neutral-900 tracking-tight">ไม่พบข้อมูลโครงการ</h3>
                <p className="text-neutral-500 max-w-xs mx-auto mt-2 mb-8 font-medium">
                  ไม่พบรายการโครงการที่ตรงตามเงื่อนไข หรือยังไม่มีข้อมูลในระบบ
                </p>
                <button 
                  onClick={handleSyncGoogleSheet}
                  className="flex items-center gap-2 px-8 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all active:scale-95"
                >
                  <Database className="w-5 h-5" />
                  Sync All
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="map"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-[600px] bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden"
          >
            <ProjectMap projects={filteredProjects} onSync={handleSyncGoogleSheet} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">{editingProject ? 'แก้ไขโครงการ' : 'เพิ่มโครงการใหม่'}</h3>
                <p className="text-sm text-neutral-500">กรอกข้อมูลโครงการให้ครบถ้วน</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                <X className="w-6 h-6 text-neutral-400" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ชื่อโครงการ</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ประเภทโครงการ</label>
                  <select 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option>ถนน</option>
                    <option>รางระบายน้ำ</option>
                    <option>ท่อระบายน้ำ</option>
                    <option>ขยายไหล่ทาง</option>
                    <option>อาคาร</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">งบประมาณ (บาท)</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    className={`w-full px-4 py-3 bg-neutral-50 border ${budgetError ? 'border-red-500 ring-1 ring-red-500' : 'border-neutral-200'} rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none`}
                    value={formData.budget}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setFormData({...formData, budget: val});
                      if (val > 0) setBudgetError(null);
                    }}
                  />
                  {budgetError && (
                    <p className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {budgetError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">สถานะ</label>
                  <select 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option>In Progress</option>
                    <option>Completed</option>
                    <option>Delayed</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ความก้าวหน้า (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.progress}
                    onChange={e => setFormData({...formData, progress: Number(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ละติจูด</label>
                  <input 
                    type="number" 
                    step="any"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.lat}
                    onChange={e => setFormData({...formData, lat: Number(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ลองจิจูด</label>
                  <input 
                    type="number" 
                    step="any"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.lng}
                    onChange={e => setFormData({...formData, lng: Number(e.target.value)})}
                  />
                </div>
              </div>
            </form>

            <div className="px-8 py-6 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-neutral-500 font-bold hover:text-neutral-900 transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSave}
                className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-900/20 transition-all"
              >
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = {
    'Completed': 'bg-green-50 text-green-700 border-green-200',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
    'Delayed': 'bg-red-50 text-red-700 border-red-200'
  };
  const icons = {
    'Completed': <CheckCircle2 className="w-3 h-3" />,
    'In Progress': <Clock className="w-3 h-3" />,
    'Delayed': <AlertCircle className="w-3 h-3" />
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${colors[status as keyof typeof colors]}`}>
      {icons[status as keyof typeof icons]}
      {status}
    </div>
  );
};

export default ProjectManagement;
