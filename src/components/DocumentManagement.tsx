import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, addDoc } from '../firebase';
import { Project } from './Dashboard';
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Calendar, 
  User, 
  Filter,
  FileCode,
  FileSpreadsheet,
  FileCheck,
  FileWarning,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface ProjectDocument {
  id: string;
  projectId: string;
  type: 'TOR' | 'BOQ' | 'Drawing' | 'Contract' | 'Inspection Report';
  fileUrl: string;
  uploadDate: string;
  uploader: string;
}

const DocumentManagement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    type: 'TOR' as any,
    fileUrl: '',
    uploader: '',
  });

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData: Project[] = [];
      snapshot.forEach((doc) => {
        projectsData.push({ ...doc.data(), id: doc.id } as Project);
      });
      setProjects(projectsData);
    });

    const qDocs = query(collection(db, 'documents'), orderBy('uploadDate', 'desc'));
    const unsubscribeDocs = onSnapshot(qDocs, (snapshot) => {
      const docsData: ProjectDocument[] = [];
      snapshot.forEach((doc) => {
        docsData.push({ ...doc.data(), id: doc.id } as ProjectDocument);
      });
      setDocuments(docsData);
    });

    return () => {
      unsubscribe();
      unsubscribeDocs();
    };
  }, []);

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'documents'), {
        ...formData,
        uploadDate: new Date().toISOString()
      });
      setIsModalOpen(false);
      setFormData({
        projectId: '',
        type: 'TOR',
        fileUrl: '',
        uploader: '',
      });
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'TOR': return <FileCode className="w-5 h-5 text-blue-500" />;
      case 'BOQ': return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'Contract': return <FileCheck className="w-5 h-5 text-neutral-900" />;
      case 'Inspection Report': return <FileWarning className="w-5 h-5 text-red-500" />;
      default: return <FileText className="w-5 h-5 text-neutral-400" />;
    }
  };

  const filteredDocs = documents.filter(d => {
    const project = projects.find(p => p.id === d.projectId);
    return project?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           d.type.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="ค้นหาเอกสาร..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          อัปโหลดเอกสาร
        </button>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredDocs.map((doc) => {
          const project = projects.find(p => p.id === doc.projectId);
          return (
            <div key={doc.id} className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center border border-neutral-100 group-hover:bg-neutral-900 group-hover:border-neutral-900 transition-all">
                  <div className="group-hover:text-white transition-colors">
                    {getFileIcon(doc.type)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-neutral-400 hover:text-red-600 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 mb-1 line-clamp-1">{project?.name || 'Unknown Project'}</h4>
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{doc.type}</span>
                </div>

                <div className="pt-4 border-t border-neutral-50 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(doc.uploadDate), 'dd/MM/yyyy')}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                    <User className="w-3 h-3" />
                    {doc.uploader}
                  </div>
                </div>

                <a 
                  href={doc.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-neutral-50 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-900 hover:text-white transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  เปิดไฟล์
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-neutral-100">
              <h3 className="text-xl font-bold text-neutral-900">อัปโหลดเอกสาร</h3>
              <p className="text-sm text-neutral-500">เลือกไฟล์และระบุประเภทเอกสาร</p>
            </div>
            
            <form onSubmit={handleSaveDocument} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">เลือกโครงการ</label>
                <select 
                  required
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                  value={formData.projectId}
                  onChange={e => setFormData({...formData, projectId: e.target.value})}
                >
                  <option value="">เลือกโครงการ...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ประเภทเอกสาร</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="TOR">TOR</option>
                    <option value="BOQ">BOQ</option>
                    <option value="Drawing">แบบก่อสร้าง</option>
                    <option value="Contract">สัญญาจ้าง</option>
                    <option value="Inspection Report">รายงานตรวจงาน</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ผู้บันทึก</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.uploader}
                    onChange={e => setFormData({...formData, uploader: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">URL ไฟล์เอกสาร</label>
                <input 
                  required
                  type="url" 
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                  value={formData.fileUrl}
                  onChange={e => setFormData({...formData, fileUrl: e.target.value})}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-neutral-500 font-bold hover:text-neutral-900 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-8 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;
