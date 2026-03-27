import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc } from '../firebase';
import { Project } from './Dashboard';
import { 
  TrendingUp, 
  Plus, 
  Calendar, 
  Image as ImageIcon, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  ChevronRight,
  ArrowRight,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { notifyProjectUpdate } from '../utils/notificationService';

interface ProgressReport {
  id: string;
  projectId: string;
  reportDate: string;
  progressPercent: number;
  details: string;
  issues: string;
  photos: string[];
}

const ProgressTracking: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    reportDate: new Date().toISOString().split('T')[0],
    progressPercent: 0,
    details: '',
    issues: '',
    photos: [] as string[],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, base64String]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData: Project[] = [];
      snapshot.forEach((doc) => {
        projectsData.push({ ...doc.data(), id: doc.id } as Project);
      });
      setProjects(projectsData);
      setLoading(false);
    });

    const qReports = query(collection(db, 'progress_reports'), orderBy('reportDate', 'desc'));
    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      const reportsData: ProgressReport[] = [];
      snapshot.forEach((doc) => {
        reportsData.push({ ...doc.data(), id: doc.id } as ProgressReport);
      });
      setReports(reportsData);
    });

    return () => {
      unsubscribe();
      unsubscribeReports();
    };
  }, []);

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      // 1. Add Report
      await addDoc(collection(db, 'progress_reports'), {
        ...formData,
        projectId: selectedProject.id,
      });

      // 2. Update Project Progress
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        progress: formData.progressPercent,
        updatedAt: new Date().toISOString()
      });

      // 3. Notify relevant users
      if (formData.progressPercent !== selectedProject.progress) {
        await notifyProjectUpdate(selectedProject.name, selectedProject.id, 'progress', formData.progressPercent);
      }

      setIsModalOpen(false);
      setFormData({
        reportDate: new Date().toISOString().split('T')[0],
        progressPercent: 0,
        details: '',
        issues: '',
        photos: [],
      });
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Project List */}
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-lg font-bold text-neutral-900 mb-4">เลือกโครงการ</h3>
        <div className="space-y-3">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                selectedProject?.id === project.id 
                  ? 'bg-neutral-900 border-neutral-900 shadow-lg shadow-neutral-900/20 text-white' 
                  : 'bg-white border-neutral-200 text-neutral-900 hover:border-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  selectedProject?.id === project.id ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                }`}>
                  {project.id}
                </span>
                <span className={`text-xs font-bold ${
                  selectedProject?.id === project.id ? 'text-white/80' : 'text-neutral-400'
                }`}>
                  {project.progress}%
                </span>
              </div>
              <h4 className="font-bold line-clamp-2 mb-3">{project.name}</h4>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${selectedProject?.id === project.id ? 'bg-white' : 'bg-neutral-900'}`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Reports Timeline */}
      <div className="lg:col-span-2 space-y-6">
        {selectedProject ? (
          <>
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">{selectedProject.name}</h3>
                <p className="text-sm text-neutral-500">ประวัติการรายงานความก้าวหน้า</p>
              </div>
              <button 
                onClick={() => {
                  setFormData(prev => ({ ...prev, progressPercent: selectedProject.progress }));
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all"
              >
                <Plus className="w-5 h-5" />
                อัปเดตหน้างาน
              </button>
            </div>

            <div className="space-y-6 relative before:absolute before:left-8 before:top-0 before:bottom-0 before:w-px before:bg-neutral-200">
              {reports.filter(r => r.projectId === selectedProject.id).map((report, idx) => (
                <div key={report.id} className="relative pl-16">
                  <div className="absolute left-6 top-0 w-4 h-4 rounded-full bg-white border-4 border-neutral-900 z-10" />
                  <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-bold text-neutral-900">
                          {format(new Date(report.reportDate), 'dd MMMM yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-neutral-900 text-white rounded-lg text-xs font-bold">
                        <TrendingUp className="w-3 h-3" />
                        {report.progressPercent}%
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">รายละเอียดงาน</p>
                        <p className="text-sm text-neutral-600 leading-relaxed">{report.details}</p>
                      </div>
                      
                      {report.issues && (
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                          <div className="flex items-center gap-2 text-red-700 mb-1">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">ปัญหาอุปสรรค</span>
                          </div>
                          <p className="text-sm text-red-600">{report.issues}</p>
                        </div>
                      )}

                      {report.photos && report.photos.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                          {report.photos.map((photo, pIdx) => (
                            <div key={pIdx} className="w-24 h-24 rounded-xl overflow-hidden border border-neutral-200 shadow-sm">
                              <img 
                                src={photo} 
                                alt={`Progress ${pIdx + 1}`} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {reports.filter(r => r.projectId === selectedProject.id).length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-400 bg-white rounded-2xl border border-neutral-200 border-dashed ml-16">
                  <Clock className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium">ยังไม่มีการรายงานความก้าวหน้า</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white rounded-3xl border border-neutral-200 border-dashed text-neutral-400">
            <TrendingUp className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-lg font-bold">กรุณาเลือกโครงการเพื่อดูความก้าวหน้า</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-neutral-100">
              <h3 className="text-xl font-bold text-neutral-900">รายงานความก้าวหน้า</h3>
              <p className="text-sm text-neutral-500">{selectedProject.name}</p>
            </div>
            
            <form onSubmit={handleSaveReport} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">วันที่รายงาน</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.reportDate}
                    onChange={e => setFormData({...formData, reportDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ความก้าวหน้า (%)</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.progressPercent}
                    onChange={e => setFormData({...formData, progressPercent: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">รายละเอียดงาน</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none"
                  value={formData.details}
                  onChange={e => setFormData({...formData, details: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ปัญหาอุปสรรค (ถ้ามี)</label>
                <textarea 
                  rows={2}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none resize-none"
                  value={formData.issues}
                  onChange={e => setFormData({...formData, issues: e.target.value})}
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">รูปภาพหน้างาน</label>
                <div className="flex flex-wrap gap-3">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 group">
                      <img src={photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-100 hover:border-neutral-300 transition-all">
                    <Plus className="w-6 h-6 text-neutral-400" />
                    <span className="text-[10px] font-bold text-neutral-400 mt-1">เพิ่มรูป</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
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
                  บันทึกรายงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracking;
