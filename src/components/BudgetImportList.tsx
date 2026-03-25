import React, { useEffect, useState } from 'react';
import { db, collection, onSnapshot, query, orderBy, addDoc } from '../firebase';
import { handleFirestoreError } from '../utils/firestoreErrorHandler';
import { useAuth } from '../useAuth';
import { 
  FileText, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Search,
  ArrowLeft,
  ChevronRight,
  Database,
  PlusCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface BudgetImport {
  id: string;
  fiscalYear: number;
  projectName: string;
  category: string;
  villageNo: number;
  villageName: string;
  description: string;
  budget: number;
  sourceFile: string;
  importDate: string;
}

const BudgetImportList: React.FC = () => {
  const { user } = useAuth();
  const [imports, setImports] = useState<BudgetImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [converting, setConverting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'budget_imports'), orderBy('importDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: BudgetImport[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id } as BudgetImport);
      });
      setImports(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'Error loading budget imports');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const convertToProject = async (item: BudgetImport) => {
    if (!window.confirm(`คุณต้องการเปลี่ยนโครงการ "${item.projectName}" เป็นโครงการก่อสร้างจริงใช่หรือไม่?`)) return;
    
    setConverting(item.id);
    try {
      await addDoc(collection(db, 'projects'), {
        id: `PROJ-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        name: item.projectName,
        type: item.category,
        fiscalYear: item.fiscalYear.toString(),
        budget: item.budget,
        status: 'In Progress',
        progress: 0,
        updatedAt: new Date().toISOString(),
        contractor: '-',
        responsiblePerson: '-',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
        lat: 16.05,
        lng: 103.65,
        description: item.description,
        villageName: item.villageName,
        villageNo: item.villageNo
      });
      alert('สร้างโครงการก่อสร้างเรียบร้อยแล้ว!');
    } catch (error) {
      console.error('Conversion error:', error);
      alert('เกิดข้อผิดพลาดในการสร้างโครงการ');
    } finally {
      setConverting(null);
    }
  };

  const filteredImports = imports.filter(item => 
    item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.villageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalBudget = filteredImports.reduce((sum, item) => sum + item.budget, 0);

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-neutral-200">
              <ArrowLeft className="w-6 h-6 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">รายการงบประมาณ พ.ศ. 2569</h1>
              <p className="text-neutral-500">ข้อมูลโครงการที่นำเข้าจากร่างข้อบัญญัติ</p>
            </div>
          </div>
          
          <div className="bg-white px-6 py-4 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign className="text-green-600 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">งบประมาณรวมที่เลือก</p>
              <p className="text-xl font-bold text-neutral-900">฿{totalBudget.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อโครงการ, หมู่บ้าน หรือหมวดหมู่..." 
              className="w-full pl-12 pr-4 py-4 bg-white border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-neutral-900 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bg-neutral-900 rounded-2xl p-4 flex items-center justify-between text-white shadow-lg shadow-neutral-900/20">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-neutral-400" />
              <span className="text-sm font-medium">ทั้งหมด</span>
            </div>
            <span className="text-2xl font-bold">{filteredImports.length}</span>
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
            </div>
          ) : filteredImports.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-neutral-300 p-12 text-center">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500 font-medium">ไม่พบข้อมูลที่ค้นหา</p>
            </div>
          ) : (
            filteredImports.map((item) => (
              <div key={item.id} className="group bg-white rounded-2xl border border-neutral-200 p-6 hover:border-neutral-900 transition-all hover:shadow-xl hover:shadow-neutral-900/5">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded text-[10px] font-bold uppercase tracking-wider">
                            {item.category}
                          </span>
                          <span className="text-xs text-neutral-400 font-medium">
                            ปีงบประมาณ {item.fiscalYear}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 group-hover:text-neutral-900 transition-colors">
                          {item.projectName}
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">งบประมาณ</p>
                        <p className="text-xl font-bold text-neutral-900">฿{item.budget.toLocaleString()}</p>
                      </div>
                    </div>

                    <p className="text-neutral-600 text-sm leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-6 pt-2">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          หมู่ที่ {item.villageNo || '-'} {item.villageName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.sourceFile}</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          นำเข้าเมื่อ {new Date(item.importDate).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center md:border-l border-neutral-100 md:pl-6 gap-3">
                    <button 
                      onClick={() => convertToProject(item)}
                      disabled={converting === item.id}
                      className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-all disabled:opacity-50"
                    >
                      <PlusCircle className="w-4 h-4" />
                      {converting === item.id ? 'กำลังสร้าง...' : 'สร้างโครงการ'}
                    </button>
                    <button className="p-3 bg-neutral-50 text-neutral-400 rounded-xl hover:bg-neutral-100 transition-all">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetImportList;
