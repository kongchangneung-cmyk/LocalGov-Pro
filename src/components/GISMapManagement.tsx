import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, updateDoc, doc } from '../firebase';
import { Project } from './Dashboard';
import { 
  Map as MapIcon, 
  MapPin, 
  Search, 
  Navigation, 
  Save, 
  Crosshair,
  Layers,
  Info
} from 'lucide-react';

const GISMapManagement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [coords, setCoords] = useState({ lat: 16.05, lng: 103.65 });

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

    return () => unsubscribe();
  }, []);

  const handleUpdateCoords = async () => {
    if (!selectedProject) return;
    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        lat: coords.lat,
        lng: coords.lng,
        updatedAt: new Date().toISOString()
      });
      alert('อัปเดตพิกัดเรียบร้อยแล้ว!');
    } catch (error) {
      console.error('Error updating coords:', error);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
      {/* Project Selector */}
      <div className="lg:col-span-1 flex flex-col gap-6 bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-neutral-900">เลือกโครงการ</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="ค้นหาโครงการ..." 
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-neutral-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                setSelectedProject(project);
                setCoords({ lat: project.lat || 16.05, lng: project.lng || 103.65 });
              }}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                selectedProject?.id === project.id 
                  ? 'bg-neutral-900 border-neutral-900 text-white shadow-lg' 
                  : 'bg-white border-neutral-100 text-neutral-900 hover:border-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  selectedProject?.id === project.id ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'
                }`}>
                  {project.id}
                </span>
                <MapPin className={`w-3 h-3 ${project.lat ? 'text-green-500' : 'text-neutral-300'}`} />
              </div>
              <h4 className="text-sm font-bold line-clamp-1">{project.name}</h4>
              <p className={`text-[10px] mt-1 font-mono ${selectedProject?.id === project.id ? 'text-white/60' : 'text-neutral-400'}`}>
                {project.lat ? `${project.lat.toFixed(4)}, ${project.lng.toFixed(4)}` : 'ยังไม่ได้กำหนดพิกัด'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Map Interface */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex-1 bg-neutral-100 rounded-3xl border border-neutral-200 shadow-sm relative overflow-hidden">
          {/* Mock Map Background */}
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/map/1200/800')] bg-cover bg-center opacity-40 grayscale" />
          <div className="absolute inset-0 bg-neutral-900/5" />
          
          {/* Map Grid Overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.1 }} />

          {/* Map Controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-2">
            <button className="p-3 bg-white rounded-xl shadow-lg hover:bg-neutral-50 transition-colors">
              <Layers className="w-5 h-5 text-neutral-600" />
            </button>
            <button className="p-3 bg-white rounded-xl shadow-lg hover:bg-neutral-50 transition-colors">
              <Crosshair className="w-5 h-5 text-neutral-600" />
            </button>
          </div>

          {/* Map Marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center animate-bounce">
            <div className="bg-neutral-900 text-white px-3 py-1 rounded-lg text-[10px] font-bold mb-1 shadow-xl whitespace-nowrap">
              {selectedProject?.name || 'เลือกโครงการ'}
            </div>
            <MapPin className="w-10 h-10 text-red-500 drop-shadow-2xl" />
          </div>

          {/* Map Info Overlay */}
          <div className="absolute bottom-6 left-6 right-6 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Latitude</label>
                <input 
                  type="number" 
                  step="any"
                  className="bg-transparent text-lg font-black text-neutral-900 outline-none w-32"
                  value={coords.lat}
                  onChange={e => setCoords({ ...coords, lat: Number(e.target.value) })}
                />
              </div>
              <div className="w-px h-10 bg-neutral-200" />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Longitude</label>
                <input 
                  type="number" 
                  step="any"
                  className="bg-transparent text-lg font-black text-neutral-900 outline-none w-32"
                  value={coords.lng}
                  onChange={e => setCoords({ ...coords, lng: Number(e.target.value) })}
                />
              </div>
            </div>
            
            <button 
              disabled={!selectedProject}
              onClick={handleUpdateCoords}
              className="flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-2xl font-bold hover:bg-neutral-800 shadow-xl shadow-neutral-900/20 transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              บันทึกพิกัด
            </button>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            <strong>คำแนะนำ:</strong> การกำหนดพิกัดที่ถูกต้องจะช่วยให้โครงการแสดงผลบนแผนที่หน้าหลัก (Public Dashboard) ได้อย่างแม่นยำ 
            กรุณาตรวจสอบพิกัดจากหน้างานจริงหรือใช้เครื่องมือ GIS ของ อบต.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GISMapManagement;
