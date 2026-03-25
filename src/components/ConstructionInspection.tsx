import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, addDoc } from '../firebase';
import { Project } from './Dashboard';
import { 
  ClipboardCheck, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  User,
  MessageSquare,
  Image as ImageIcon,
  Search,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface Inspection {
  id: string;
  projectId: string;
  inspectionDate: string;
  inspector: string;
  result: 'Pass' | 'Fix' | 'Fail';
  suggestions: string;
  photos: string[];
}

const ConstructionInspection: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    inspector: '',
    result: 'Pass' as 'Pass' | 'Fix' | 'Fail',
    suggestions: '',
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

    const qInspections = query(collection(db, 'inspections'), orderBy('inspectionDate', 'desc'));
    const unsubscribeInspections = onSnapshot(qInspections, (snapshot) => {
      const inspectionsData: Inspection[] = [];
      snapshot.forEach((doc) => {
        inspectionsData.push({ ...doc.data(), id: doc.id } as Inspection);
      });
      setInspections(inspectionsData);
    });

    return () => {
      unsubscribe();
      unsubscribeInspections();
    };
  }, []);

  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inspections'), {
        ...formData,
        photos: []
      });
      setIsModalOpen(false);
      setFormData({
        projectId: '',
        inspectionDate: new Date().toISOString().split('T')[0],
        inspector: '',
        result: 'Pass',
        suggestions: '',
      });
    } catch (error) {
      console.error('Error saving inspection:', error);
    }
  };

  const filteredInspections = inspections.filter(i => {
    const project = projects.find(p => p.id === i.projectId);
    return project?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           i.inspector.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="ค้นหาการตรวจงาน..." 
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
          บันทึกการตรวจงาน
        </button>
      </div>

      {/* Inspection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInspections.map((inspection) => {
          const project = projects.find(p => p.id === inspection.projectId);
          return (
            <div key={inspection.id} className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className={`p-6 flex items-center justify-between ${
                inspection.result === 'Pass' ? 'bg-green-50' : 
                inspection.result === 'Fix' ? 'bg-yellow-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    inspection.result === 'Pass' ? 'bg-green-500' : 
                    inspection.result === 'Fix' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {inspection.result === 'Pass' ? <CheckCircle2 className="text-white w-6 h-6" /> : 
                     inspection.result === 'Fix' ? <AlertCircle className="text-white w-6 h-6" /> : 
                     <XCircle className="text-white w-6 h-6" />}
                  </div>
                  <span className={`text-sm font-black uppercase tracking-widest ${
                    inspection.result === 'Pass' ? 'text-green-700' : 
                    inspection.result === 'Fix' ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {inspection.result === 'Pass' ? 'ผ่าน' : 
                     inspection.result === 'Fix' ? 'แก้ไข' : 'ไม่ผ่าน'}
                  </span>
                </div>
                <span className="text-xs font-bold text-neutral-400">
                  {format(new Date(inspection.inspectionDate), 'dd/MM/yyyy')}
                </span>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 mb-1 line-clamp-2">{project?.name || 'Unknown Project'}</h4>
                  <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest">ID: {inspection.projectId}</p>
                </div>

                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <User className="w-4 h-4 text-neutral-400" />
                  <span className="text-xs font-bold text-neutral-600">{inspection.inspector}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <MessageSquare className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">ข้อเสนอแนะ</span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed italic">"{inspection.suggestions}"</p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center border border-neutral-200 border-dashed">
                    <ImageIcon className="w-4 h-4 text-neutral-300" />
                  </div>
                  <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center border border-neutral-200 border-dashed">
                    <ImageIcon className="w-4 h-4 text-neutral-300" />
                  </div>
                </div>
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
              <h3 className="text-xl font-bold text-neutral-900">บันทึกการตรวจงาน</h3>
              <p className="text-sm text-neutral-500">กรอกผลการตรวจสอบหน้างาน</p>
            </div>
            
            <form onSubmit={handleSaveInspection} className="p-8 space-y-6">
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
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">วันที่ตรวจ</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.inspectionDate}
                    onChange={e => setFormData({...formData, inspectionDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ผู้ตรวจ</label>
                  <input 
                    required
                    type="text" 
                    placeholder="ชื่อนายช่าง"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.inspector}
                    onChange={e => setFormData({...formData, inspector: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ผลการตรวจ</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Pass', 'Fix', 'Fail'].map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setFormData({...formData, result: res as any})}
                      className={`py-3 rounded-xl border font-bold text-xs transition-all ${
                        formData.result === res 
                          ? res === 'Pass' ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' :
                            res === 'Fix' ? 'bg-yellow-500 border-yellow-500 text-white shadow-lg shadow-yellow-500/20' :
                            'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20'
                          : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-900'
                      }`}
                    >
                      {res === 'Pass' ? 'ผ่าน' : res === 'Fix' ? 'แก้ไข' : 'ไม่ผ่าน'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ข้อเสนอแนะ</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none"
                  value={formData.suggestions}
                  onChange={e => setFormData({...formData, suggestions: e.target.value})}
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

export default ConstructionInspection;
