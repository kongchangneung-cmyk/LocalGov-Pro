import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, addDoc } from '../firebase';
import { Project } from './Dashboard';
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  FileText, 
  CheckCircle2,
  Clock,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

interface Disbursement {
  id: string;
  projectId: string;
  installment: number;
  paymentDate: string;
  amount: number;
  remainingBudget: number;
  attachments: string[];
}

const BudgetDisbursement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    installment: 1,
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
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

    const qDisbursements = query(collection(db, 'disbursements'), orderBy('paymentDate', 'desc'));
    const unsubscribeDisbursements = onSnapshot(qDisbursements, (snapshot) => {
      const disbursementsData: Disbursement[] = [];
      snapshot.forEach((doc) => {
        disbursementsData.push({ ...doc.data(), id: doc.id } as Disbursement);
      });
      setDisbursements(disbursementsData);
    });

    return () => {
      unsubscribe();
      unsubscribeDisbursements();
    };
  }, []);

  const handleSaveDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      const projectDisbursements = disbursements.filter(d => d.projectId === selectedProject.id);
      const totalPaid = projectDisbursements.reduce((sum, d) => sum + d.amount, 0) + formData.amount;
      const remaining = selectedProject.budget - totalPaid;

      await addDoc(collection(db, 'disbursements'), {
        ...formData,
        projectId: selectedProject.id,
        remainingBudget: remaining,
        attachments: []
      });
      setIsModalOpen(false);
      setFormData({
        installment: 1,
        paymentDate: new Date().toISOString().split('T')[0],
        amount: 0,
      });
    } catch (error) {
      console.error('Error saving disbursement:', error);
    }
  };

  const calculateStats = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    const projectDisbursements = disbursements.filter(d => d.projectId === projectId);
    const totalPaid = projectDisbursements.reduce((sum, d) => sum + d.amount, 0);
    const remaining = (project?.budget || 0) - totalPaid;
    const percent = project?.budget ? (totalPaid / project.budget) * 100 : 0;

    return { totalPaid, remaining, percent };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Project List */}
      <div className="lg:col-span-1 space-y-4">
        <h3 className="text-lg font-bold text-neutral-900 mb-4">สถานะงบประมาณ</h3>
        <div className="space-y-3">
          {projects.map((project) => {
            const stats = calculateStats(project.id);
            return (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={`w-full text-left p-6 rounded-3xl border transition-all ${
                  selectedProject?.id === project.id 
                    ? 'bg-neutral-900 border-neutral-900 shadow-lg shadow-neutral-900/20 text-white' 
                    : 'bg-white border-neutral-200 text-neutral-900 hover:border-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    selectedProject?.id === project.id ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {project.id}
                  </span>
                  <div className={`flex items-center gap-1 text-[10px] font-bold ${
                    selectedProject?.id === project.id ? 'text-white/80' : 'text-neutral-400'
                  }`}>
                    <TrendingUp className="w-3 h-3" />
                    {stats.percent.toFixed(0)}%
                  </div>
                </div>
                <h4 className="font-bold line-clamp-1 mb-4">{project.name}</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest opacity-60">
                    <span>งบประมาณ</span>
                    <span>฿{project.budget.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${selectedProject?.id === project.id ? 'bg-white' : 'bg-neutral-900'}`}
                      style={{ width: `${stats.percent}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Disbursement History */}
      <div className="lg:col-span-2 space-y-6">
        {selectedProject ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">งบประมาณรวม</p>
                <p className="text-2xl font-black text-neutral-900">฿{selectedProject.budget.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100 shadow-sm">
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">เบิกจ่ายแล้ว</p>
                <p className="text-2xl font-black text-green-700">฿{calculateStats(selectedProject.id).totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-neutral-900 p-6 rounded-2xl shadow-lg shadow-neutral-900/20">
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">งบคงเหลือ</p>
                <p className="text-2xl font-black text-white">฿{calculateStats(selectedProject.id).remaining.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">ประวัติการเบิกจ่าย</h3>
                  <p className="text-sm text-neutral-500">ติดตามงวดงานและการเงิน</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 shadow-lg shadow-neutral-900/20 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  บันทึกการเบิกจ่าย
                </button>
              </div>

              <div className="space-y-4">
                {disbursements.filter(d => d.projectId === selectedProject.id).map((disbursement) => (
                  <div key={disbursement.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100 group hover:bg-neutral-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-neutral-200 shadow-sm">
                        <span className="text-sm font-black text-neutral-900">{disbursement.installment}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900">งวดงานที่ {disbursement.installment}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(disbursement.paymentDate), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-neutral-900">฿{disbursement.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">คงเหลือ ฿{disbursement.remainingBudget.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {disbursements.filter(d => d.projectId === selectedProject.id).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                    <Wallet className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium">ยังไม่มีข้อมูลการเบิกจ่าย</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white rounded-3xl border border-neutral-200 border-dashed text-neutral-400">
            <Wallet className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-lg font-bold">กรุณาเลือกโครงการเพื่อดูงบประมาณ</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedProject && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-neutral-100">
              <h3 className="text-xl font-bold text-neutral-900">บันทึกการเบิกจ่าย</h3>
              <p className="text-sm text-neutral-500">{selectedProject.name}</p>
            </div>
            
            <form onSubmit={handleSaveDisbursement} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">งวดงานที่</label>
                  <input 
                    required
                    type="number" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.installment}
                    onChange={e => setFormData({...formData, installment: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">วันที่เบิก</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.paymentDate}
                    onChange={e => setFormData({...formData, paymentDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">จำนวนเงิน (บาท)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">฿</div>
                  <input 
                    required
                    type="number" 
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 border-dashed">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span className="text-neutral-400 uppercase tracking-widest">สรุปหลังเบิกจ่าย</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">คงเหลือสุทธิ</span>
                  <span className="text-lg font-black text-neutral-900">
                    ฿{(calculateStats(selectedProject.id).remaining - formData.amount).toLocaleString()}
                  </span>
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

export default BudgetDisbursement;
