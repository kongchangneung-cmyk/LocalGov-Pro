import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { Skeleton } from './ui/Skeleton';
import * as XLSX from 'xlsx';
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
  List,
  Download,
  FileText
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
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'map'>('grid');
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  interface FormData {
    name: string;
    type: string;
    fiscalYear: string;
    budget: number;
    contractor: string;
    startDate: string;
    endDate: string;
    status: string;
    progress: number;
    lat: number;
    lng: number;
    responsiblePerson: string;
    description: string;
    locationName: string;
    contractorPhone: string;
  }

  const [formData, setFormData] = useState<FormData>({
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
    responsiblePerson: '',
    description: '',
    locationName: '',
    contractorPhone: ''
  });

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
      setLastUpdated(new Date());
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

  const handleExportCSV = () => {
    const headers = ['ID', 'Project Name', 'Type', 'Budget', 'Status', 'Progress (%)', 'Contractor', 'Responsible Person', 'Start Date', 'End Date', 'Fiscal Year'];
    const rows = filteredProjects.map(p => [
      p.id,
      p.name,
      p.type,
      p.budget,
      p.status,
      p.progress,
      p.contractor || '',
      p.responsiblePerson || '',
      p.startDate || '',
      p.endDate || '',
      p.fiscalYear || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `projects_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLSX = () => {
    const dataToExport = filteredProjects.map(p => ({
      'ID': p.id,
      'ชื่อโครงการ': p.name,
      'ประเภท': p.type,
      'งบประมาณ': p.budget,
      'สถานะ': p.status,
      'ความก้าวหน้า (%)': p.progress,
      'ผู้รับผิดชอบ': p.responsiblePerson || '',
      'ผู้รับเหมา': p.contractor || '',
      'วันที่เริ่ม': p.startDate || '',
      'วันที่สิ้นสุด': p.endDate || '',
      'ปีงบประมาณ': p.fiscalYear || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    XLSX.writeFile(wb, `projects_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleExportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    
    const doc = new jsPDF();
    
    // Note: Default jsPDF fonts don't support Thai. 
    // For a real app, we would load a Thai font here.
    // For now, we'll use English labels but include the data.
    
    doc.text("Project Export Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);

    const tableData = filteredProjects.map(p => [
      p.id,
      p.name,
      p.type,
      formatCurrency(p.budget),
      p.status,
      `${p.progress}%`
    ]);

    (doc as any).autoTable({
      head: [['ID', 'Project Name', 'Type', 'Budget', 'Status', 'Progress']],
      body: tableData,
      startY: 30,
      styles: { font: 'helvetica' }
    });

    doc.save(`projects_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

  const handleDelete = async (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteDoc(doc(db, 'projects', deleteId));
        setDeleteId(null);
      } catch (error) {
        console.error('Error deleting project:', error);
        setDeleteId(null);
      }
    } else if (bulkDeleteIds.length > 0) {
      try {
        const batch = writeBatch(db);
        bulkDeleteIds.forEach(id => {
          batch.delete(doc(db, 'projects', id));
        });
        await batch.commit();
        setBulkDeleteIds([]);
        setSelectedIds([]);
      } catch (error) {
        console.error('Error bulk deleting:', error);
        setBulkDeleteIds([]);
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
      responsiblePerson: '',
      description: '',
      locationName: '',
      contractorPhone: ''
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
        setNotification({ type: 'error', message: 'ไม่พบข้อมูลใน Google Sheet' });
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
      setNotification({ type: 'success', message: `ซิงค์ข้อมูลสำเร็จ! นำเข้าทั้งหมด ${count} รายการ` });
    } catch (error) {
      console.error('Sync error:', error);
      setNotification({ type: 'error', message: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setLoading(false);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      const batch = writeBatch(db);
      let count = 0;

      for (const item of jsonData) {
        // Validation: Ensure required fields exist
        if (!item.name || !item.budget) continue;

        const projectData = {
          name: item.name,
          type: item.type || 'ถนน',
          budget: Number(item.budget) || 0,
          status: item.status || 'In Progress',
          progress: Number(item.progress) || 0,
          lat: Number(item.lat) || 16.05,
          lng: Number(item.lng) || 103.65,
          updatedAt: new Date().toISOString(),
          contractor: item.contractor || '',
          responsiblePerson: item.responsiblePerson || '',
          fiscalYear: item.fiscalYear || '2569',
          description: item.description || '',
          locationName: item.locationName || '',
          contractorPhone: item.contractorPhone || ''
        };

        const docRef = doc(collection(db, 'projects'));
        batch.set(docRef, { ...projectData, id: `PROJ-${docRef.id.substr(0, 5).toUpperCase()}` });
        count++;
      }

      await batch.commit();
      setNotification({ type: 'success', message: `นำเข้าข้อมูลสำเร็จ! เพิ่มโครงการใหม่ ${count} รายการ` });
    } catch (error) {
      console.error('Excel import error:', error);
      setNotification({ type: 'error', message: 'เกิดข้อผิดพลาดในการนำเข้าไฟล์ Excel: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmClearAll = async () => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      projects.forEach(p => {
        batch.delete(doc(db, 'projects', p.id));
      });
      await batch.commit();
      setNotification({ type: 'success', message: 'ลบข้อมูลโครงการทั้งหมดเรียบร้อยแล้ว' });
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Error clearing projects:', error);
      setNotification({ type: 'error', message: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
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
      setImportData(result.data);
      setShowImportConfirm(true);
    } catch (error) {
      console.error('Import error:', error);
      setNotification({ type: 'error', message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' });
    }
  };

  const confirmImport = async () => {
    if (!importData.length) return;
    
    try {
      const batch = writeBatch(db);
      const importDate = new Date().toISOString();

      importData.forEach((item: any) => {
        const importRef = doc(collection(db, 'budget_imports'));
        batch.set(importRef, {
          ...item,
          importDate,
          id: importRef.id
        });
      });

      await batch.commit();
      setShowImportConfirm(false);
      setImportData([]);
      setNotification({ type: 'success', message: `นำเข้าข้อมูลสำเร็จ ${importData.length} รายการ` });
    } catch (error) {
      console.error('Confirm import error:', error);
      setNotification({ type: 'error', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           p.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, debouncedSearchTerm, statusFilter]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map(p => p.id));
    }
  }, [selectedIds.length, filteredProjects]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleBulkDelete = useCallback(() => {
    setBulkDeleteIds(selectedIds);
  }, [selectedIds]);

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
      setNotification({ type: 'success', message: `อัปเดตสถานะ ${selectedIds.length} รายการสำเร็จ` });
    } catch (error) {
      console.error('Error bulk updating status:', error);
      setNotification({ type: 'error', message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะแบบกลุ่ม' });
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

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
        
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-20 rounded-xl" />)}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-[400px] rounded-[2rem]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">{title || 'จัดการโครงการ'}</h2>
          <div className="flex items-center gap-2 mt-1">
            {typeFilter && <p className="text-sm text-neutral-500 font-medium">หมวดหมู่: {typeFilter}</p>}
            {lastUpdated && (
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 ml-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live: {format(lastUpdated, 'HH:mm:ss')}
              </span>
            )}
          </div>
        </div>
          <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1 max-w-3xl justify-end">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select 
                className="px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none text-sm font-bold"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">ทุกสถานะ</option>
                <option value="In Progress">กำลังดำเนินการ</option>
                <option value="Completed">ดำเนินการแล้วเสร็จ</option>
                <option value="Delayed">ล่าช้ากว่าแผน</option>
              </select>
            </div>
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
                <div className="relative group">
                  <button 
                    className="flex items-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Export
                    <ChevronDown className="w-4 h-4" />
                  </button>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-neutral-100 py-2 z-50 hidden group-hover:block">
                      <button 
                        onClick={handleExportCSV}
                        className="w-full text-left px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Export to CSV
                      </button>
                      <button 
                        onClick={handleExportXLSX}
                        className="w-full text-left px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                      >
                        <Database className="w-4 h-4" />
                        Export to Excel (XLSX)
                      </button>
                      <button 
                        onClick={handleExportPDF}
                        className="w-full text-left px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Export to PDF
                      </button>
                    </div>
                </div>
                <button 
                  onClick={handleSyncGoogleSheet}
                  className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold hover:bg-green-100 transition-all"
                >
                  <Database className="w-5 h-5" />
                  Sync All
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleExcelImport}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-bold hover:bg-blue-100 transition-all"
                >
                  <Database className="w-5 h-5" />
                  Import Excel
                </button>
                <button 
                  onClick={() => setShowClearConfirm(true)}
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
                    <th className="px-4 py-3 w-12">
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
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">โครงการ</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">งบประมาณ</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">สถานะ</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">ความก้าวหน้า</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredProjects.map((project) => (
                    <tr 
                      key={project.id} 
                      className={`hover:bg-neutral-50 transition-colors group ${selectedIds.includes(project.id) ? 'bg-orange-50/50' : ''}`}
                    >
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900 group-hover:text-neutral-900 line-clamp-1">{project.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded font-mono">{project.id}</span>
                            <span className="text-[10px] text-neutral-400">{project.type}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm font-bold text-neutral-900">{formatCurrency(project.budget)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/projects/${project.id}`}
                            className="p-1.5 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
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
                                responsiblePerson: project.responsiblePerson,
                                description: project.description || '',
                                locationName: project.locationName || '',
                                contractorPhone: project.contractorPhone || ''
                              }); 
                              setIsModalOpen(true); 
                            }}
                            className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(project.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
                        responsiblePerson: project.responsiblePerson || '',
                        description: project.description || '',
                        locationName: project.locationName || '',
                        contractorPhone: project.contractorPhone || ''
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
            <ProjectMap projects={filteredProjects} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      {(deleteId || bulkDeleteIds.length > 0) && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-neutral-900 text-center mb-2">ยืนยันการลบ</h3>
            <p className="text-neutral-500 text-center mb-8 font-medium">
              {deleteId ? 'คุณต้องการลบโครงการนี้ใช่หรือไม่?' : `คุณต้องการลบ ${bulkDeleteIds.length} โครงการที่เลือกใช่หรือไม่?`} การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => { setDeleteId(null); setBulkDeleteIds([]); }}
                className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-900 rounded-xl font-bold hover:bg-neutral-200 transition-all"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-900/20 transition-all"
              >
                ลบโครงการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-neutral-900 text-center mb-2">ยืนยันการลบทั้งหมด</h3>
            <p className="text-neutral-500 text-center mb-8 font-medium">
              คุณต้องการลบโครงการทั้งหมดในระบบใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-900 rounded-xl font-bold hover:bg-neutral-200 transition-all"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmClearAll}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-900/20 transition-all"
              >
                ลบทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Confirmation Dialog */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Database className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-neutral-900 text-center mb-2">ยืนยันการนำเข้าข้อมูล</h3>
            <p className="text-neutral-500 text-center mb-8 font-medium">
              พบข้อมูลที่ต้องการนำเข้าจำนวน {importData.length} รายการ คุณต้องการบันทึกข้อมูลเหล่านี้ลงในระบบใช่หรือไม่?
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => { setShowImportConfirm(false); setImportData([]); }}
                className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-900 rounded-xl font-bold hover:bg-neutral-200 transition-all"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmImport}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all"
              >
                ยืนยันการนำเข้า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-8 right-8 z-[150] animate-in slide-in-from-right duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${
            notification.type === 'success' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-sm font-bold">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="ml-2">
              <X className="w-4 h-4 opacity-50 hover:opacity-100" />
            </button>
          </div>
        </div>
      )}

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
                
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">รายละเอียดโครงการ</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">สถานที่ตั้ง (ชื่อสถานที่)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.locationName}
                    onChange={e => setFormData({...formData, locationName: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">เบอร์โทรศัพท์ผู้รับเหมา</label>
                  <input 
                    type="tel" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.contractorPhone}
                    onChange={e => setFormData({...formData, contractorPhone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">วันที่เริ่มสัญญา</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">วันที่สิ้นสุดสัญญา</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
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
