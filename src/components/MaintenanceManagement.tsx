import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from '../firebase';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  MoreVertical,
  Calendar,
  User,
  Tag,
  ChevronRight,
  X,
  Save,
  Trash2,
  Info
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  location: string;
  lat: number;
  lng: number;
  status: 'Pending' | 'In Progress' | 'Completed';
  category: 'Road' | 'Electricity' | 'Water' | 'Other';
  reporter: string;
  reportDate: string;
  updatedAt: string;
  photos?: string[];
}

const MaintenanceManagement: React.FC = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<MaintenanceRequest>>({
    title: '',
    description: '',
    location: '',
    lat: 16.05,
    lng: 103.65,
    status: 'Pending',
    category: 'Road',
    reporter: '',
  });

  useEffect(() => {
    const q = query(collection(db, 'maintenance'), orderBy('reportDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: MaintenanceRequest[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id } as MaintenanceRequest);
      });
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'Pending').length,
    inProgress: requests.filter(r => r.status === 'In Progress').length,
    completed: requests.filter(r => r.status === 'Completed').length,
  };

  const chartData = [
    { name: 'รอดำเนินการ', value: stats.pending, color: '#f97316' }, // Orange
    { name: 'อยู่ระหว่างดำเนินการ', value: stats.inProgress, color: '#3b82f6' }, // Blue
    { name: 'เสร็จสิ้น', value: stats.completed, color: '#10b981' }, // Green
  ].filter(d => d.value > 0);

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.reporter.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      if (editingRequest) {
        await updateDoc(doc(db, 'maintenance', editingRequest.id), data);
      } else {
        await addDoc(collection(db, 'maintenance'), {
          ...data,
          reportDate: new Date().toISOString(),
        });
      }
      setIsModalOpen(false);
      setEditingRequest(null);
      setFormData({
        title: '',
        description: '',
        location: '',
        lat: 16.05,
        lng: 103.65,
        status: 'Pending',
        category: 'Road',
        reporter: '',
      });
    } catch (error) {
      console.error('Error saving maintenance request:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
      try {
        await deleteDoc(doc(db, 'maintenance', id));
      } catch (error) {
        console.error('Error deleting request:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Completed': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Road': return '🛣️';
      case 'Electricity': return '⚡';
      case 'Water': return '💧';
      default: return '🛠️';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">งานซ่อมบำรุง (Maintenance)</h1>
          <p className="text-neutral-500 font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            ติดตามและจัดการรายการแจ้งซ่อมบำรุงในพื้นที่
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingRequest(null);
            setFormData({
              title: '',
              description: '',
              location: '',
              lat: 16.05,
              lng: 103.65,
              status: 'Pending',
              category: 'Road',
              reporter: '',
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 shadow-xl shadow-orange-900/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          แจ้งซ่อมใหม่
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm flex items-center justify-center">
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-xl" />
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">จำนวนเรื่องทั้งหมด</p>
            <h3 className="text-3xl font-black">{stats.total} <span className="text-sm font-normal text-slate-500">รายการ</span></h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm">
          <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-1">รอดำเนินการ</p>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-orange-600">{stats.pending}</h3>
            <Clock className="w-8 h-8 text-orange-100" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm">
          <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-1">อยู่ระหว่างดำเนินการ</p>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-blue-600">{stats.inProgress}</h3>
            <AlertCircle className="w-8 h-8 text-blue-100" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm">
          <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-1">ดำเนินการแล้ว</p>
          <div className="flex items-center justify-between">
            <h3 className="text-3xl font-black text-green-600">{stats.completed}</h3>
            <CheckCircle2 className="w-8 h-8 text-green-100" />
          </div>
        </div>
      </div>

      {/* Charts & Map Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Donut Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-500" />
            สัดส่วนสถานะการดำเนินงาน
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-2 bg-white p-4 rounded-[2.5rem] border border-neutral-200 shadow-sm relative overflow-hidden min-h-[400px]">
          <div className="absolute top-8 left-8 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white shadow-lg">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              แผนที่จุดแจ้งซ่อม
            </h3>
          </div>
          <MapContainer 
            center={[16.05, 103.65]} 
            zoom={13} 
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', borderRadius: '1.5rem' }}
            className="z-0"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {requests.map((req) => (
              <Marker key={req.id} position={[req.lat, req.lng]}>
                <Popup>
                  <div className="p-2">
                    <h4 className="font-bold text-sm mb-1">{req.title}</h4>
                    <p className="text-xs text-neutral-500 mb-2">{req.location}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getStatusColor(req.status)}`}>
                      {req.status === 'Pending' ? 'รอดำเนินการ' : req.status === 'In Progress' ? 'อยู่ระหว่างดำเนินการ' : 'เสร็จสิ้น'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* List Section */}
      <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h3 className="text-xl font-bold text-slate-900">รายการแจ้งซ่อมบำรุง</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Status Filter Pills */}
            <div className="flex bg-neutral-100 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter('All')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${statusFilter === 'All' ? 'bg-white text-slate-900 shadow-sm' : 'text-neutral-500 hover:text-slate-700'}`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setStatusFilter('Pending')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${statusFilter === 'Pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-neutral-500 hover:text-orange-600'}`}
              >
                รอดำเนินการ
              </button>
              <button
                onClick={() => setStatusFilter('In Progress')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${statusFilter === 'In Progress' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-500 hover:text-blue-600'}`}
              >
                กำลังดำเนินการ
              </button>
              <button
                onClick={() => setStatusFilter('Completed')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${statusFilter === 'Completed' ? 'bg-white text-green-600 shadow-sm' : 'text-neutral-500 hover:text-green-600'}`}
              >
                เสร็จสิ้น
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="ค้นหา..." 
                className="pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50/50">
                <th className="px-8 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">ข้อมูลรายการ</th>
                <th className="px-8 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">หมวดหมู่</th>
                <th className="px-8 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">ผู้แจ้ง/วันที่</th>
                <th className="px-8 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">สถานะ</th>
                <th className="px-8 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {getCategoryIcon(req.category)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 mb-0.5">{req.title}</h4>
                        <p className="text-xs text-neutral-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {req.location}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                      {req.category === 'Road' ? 'ถนน/ทางหลวง' : req.category === 'Electricity' ? 'ไฟฟ้าสาธารณะ' : req.category === 'Water' ? 'ประปา' : 'อื่นๆ'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <User className="w-3 h-3 text-neutral-400" />
                        {req.reporter}
                      </p>
                      <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(req.reportDate), 'dd MMM yyyy', { locale: th })}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold border ${getStatusColor(req.status)}`}>
                      {req.status === 'Pending' ? 'รอดำเนินการ' : req.status === 'In Progress' ? 'อยู่ระหว่างดำเนินการ' : 'เสร็จสิ้น'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingRequest(req);
                          setFormData(req);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-neutral-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all border border-transparent hover:border-neutral-200"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(req.id)}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-neutral-400 italic">
                    ไม่พบข้อมูลรายการแจ้งซ่อม
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-neutral-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingRequest ? 'แก้ไขรายการแจ้งซ่อม' : 'แจ้งซ่อมบำรุงใหม่'}
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium">กรุณากรอกข้อมูลรายละเอียดการแจ้งซ่อมให้ครบถ้วน</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-neutral-200">
                  <X className="w-6 h-6 text-neutral-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">หัวข้อการแจ้งซ่อม</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="เช่น ไฟกิ่งดับ, ถนนเป็นหลุม"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">หมวดหมู่</label>
                    <select 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    >
                      <option value="Road">ถนน/ทางหลวง</option>
                      <option value="Electricity">ไฟฟ้าสาธารณะ</option>
                      <option value="Water">ประปา</option>
                      <option value="Other">อื่นๆ</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">รายละเอียด</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="ระบุรายละเอียดเพิ่มเติม..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">สถานที่/จุดสังเกต</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="เช่น หน้าวัดบ้านโนน"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ผู้แจ้งเรื่อง</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.reporter}
                      onChange={e => setFormData({ ...formData, reporter: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">สถานะ</label>
                    <select 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="Pending">รอดำเนินการ</option>
                      <option value="In Progress">อยู่ระหว่างดำเนินการ</option>
                      <option value="Completed">เสร็จสิ้น</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Latitude</label>
                    <input 
                      type="number" 
                      step="any"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.lat}
                      onChange={e => setFormData({ ...formData, lat: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Longitude</label>
                    <input 
                      type="number" 
                      step="any"
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.lng}
                      onChange={e => setFormData({ ...formData, lng: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>หมายเหตุ:</strong> ข้อมูลพิกัดจะถูกนำไปแสดงบนแผนที่เพื่อให้เจ้าหน้าที่เข้าตรวจสอบหน้างานได้สะดวก
                  </p>
                </div>
              </form>

              <div className="p-8 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-neutral-500 font-bold hover:text-neutral-900 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-10 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 shadow-xl shadow-orange-900/20 transition-all"
                >
                  <Save className="w-5 h-5" />
                  {editingRequest ? 'บันทึกการแก้ไข' : 'ยืนยันการแจ้งซ่อม'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MaintenanceManagement;
