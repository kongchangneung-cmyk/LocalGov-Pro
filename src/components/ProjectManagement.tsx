import React, { useState, useEffect } from 'react';
import { useAuth } from '../useAuth';
import { db, collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../firebase';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { Project } from './Dashboard';
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
  X
} from 'lucide-react';
import { format } from 'date-fns';

const ProjectManagement: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'ถนน',
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

    const q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData: Project[] = [];
      snapshot.forEach((doc) => {
        projectsData.push({ ...doc.data(), id: doc.id } as Project);
      });
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'Error loading projects');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      if (editingProject) {
        await updateDoc(doc(db, 'projects', editingProject.id), data);
      } else {
        await addDoc(collection(db, 'projects'), {
          ...data,
          id: `PROJ-${Date.now()}`
        });
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
      type: 'ถนน',
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
  };

  const seedData = async () => {
    const demoProjects = [
      { name: 'ก่อสร้างถนนคอนกรีตเสริมเหล็ก บ้านน้อยในเมือง', type: 'ถนน', budget: 75000, status: 'In Progress', progress: 45, lat: 16.054, lng: 103.652, fiscalYear: '2569' },
      { name: 'ก่อสร้างรางระบายน้ำ คสล. บ้านสามแยกโพธิ์ชัย', type: 'รางระบายน้ำ', budget: 396000, status: 'In Progress', progress: 20, lat: 16.058, lng: 103.655, fiscalYear: '2569' },
      { name: 'ก่อสร้างถนน คสล. พร้อมรางระบายน้ำ บ้านหนองผักแว่น', type: 'ถนนพร้อมรางระบายน้ำ', budget: 372000, status: 'Delayed', progress: 10, lat: 16.062, lng: 103.648, fiscalYear: '2569' },
      { name: 'วางท่อระบายน้ำ คสล. บ้านไทยอุดม', type: 'ท่อระบายน้ำ', budget: 190000, status: 'Completed', progress: 100, lat: 16.051, lng: 103.660, fiscalYear: '2569' },
      { name: 'ขยายไหล่ทางถนน คสล. บ้านป่าม่วง', type: 'ขยายไหล่ทาง', budget: 325000, status: 'In Progress', progress: 60, lat: 16.045, lng: 103.658, fiscalYear: '2569' },
    ];

    for (const p of demoProjects) {
      await addDoc(collection(db, 'projects'), {
        ...p,
        id: `PROJ-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        updatedAt: new Date().toISOString(),
        contractor: 'บริษัท ก่อสร้างไทย จำกัด',
        responsiblePerson: 'นายช่างสมชาย',
        startDate: '2026-01-01',
        endDate: '2026-06-30'
      });
    }
    alert('Seed data successfully!');
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
      alert(result.message);
    } catch (error) {
      console.error('Import error:', error);
      alert(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <button 
            onClick={handleImportBudget}
            className="flex items-center gap-2 px-4 py-3 bg-neutral-100 text-neutral-600 rounded-xl font-bold hover:bg-neutral-200 transition-all"
          >
            <Database className="w-5 h-5" />
            Import Budget 2569
          </button>
          <button 
            onClick={seedData}
            className="flex items-center gap-2 px-4 py-3 bg-neutral-100 text-neutral-600 rounded-xl font-bold hover:bg-neutral-200 transition-all"
          >
            <Database className="w-5 h-5" />
            Seed Demo
          </button>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all"
          >
            <Plus className="w-5 h-5" />
            เพิ่มโครงการ
          </button>
        </div>
      </div>

      {/* Project List */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">โครงการ</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">งบประมาณ</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">สถานะ</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">ความก้าวหน้า</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProjects.map((project) => (
                <tr key={project.id} className="hover:bg-neutral-50 transition-colors group">
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
                    <span className="text-sm font-bold text-neutral-900">฿{project.budget.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden min-w-[80px]">
                        <div 
                          className={`h-full rounded-full ${project.progress === 100 ? 'bg-green-500' : 'bg-neutral-900'}`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-neutral-900">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
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
        </div>
      </div>

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
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.budget}
                    onChange={e => setFormData({...formData, budget: Number(e.target.value)})}
                  />
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
                className="px-8 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all"
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
