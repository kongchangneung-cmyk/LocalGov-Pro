import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, LayerGroup, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Project } from './Dashboard';
import { format } from 'date-fns';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  X, 
  ChevronRight, 
  Layers, 
  Map as MapIcon,
  Globe,
  Navigation
} from 'lucide-react';

// Fix Leaflet marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = 'w-10 h-10';
  if (count > 10) size = 'w-12 h-12';
  if (count > 50) size = 'w-14 h-14';

  return L.divIcon({
    html: `<div class="flex items-center justify-center ${size} bg-orange-600 text-white rounded-full border-4 border-orange-200 shadow-xl font-black text-sm transition-all hover:scale-110"><span class="drop-shadow-md">${count}</span></div>`,
    className: 'custom-cluster-icon bg-transparent',
    iconSize: L.point(40, 40, true),
  });
};

interface PublicGISMapProps {
  projects: Project[];
}

const PublicGISMap: React.FC<PublicGISMapProps> = ({ projects }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const center: [number, number] = [16.05, 103.65]; // Default to Roi Et area based on previous context

  const uniqueTypes = Array.from(new Set(projects.map(p => p.type)));

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
    const matchesType = typeFilter === 'All' || project.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'In Progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'Delayed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-green-700';
      case 'In Progress':
        return 'text-blue-700';
      case 'Delayed':
        return 'text-red-700';
      default:
        return 'text-neutral-700';
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
    <div className="h-[700px] w-full relative rounded-[2.5rem] overflow-hidden border border-neutral-200 shadow-2xl">
      {/* Search Overlay */}
      <div className="absolute top-6 left-6 z-[1000] w-full max-w-2xl flex flex-col gap-3">
        <div className="relative group/search">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-neutral-400 group-focus-within/search:text-orange-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาโครงการบนแผนที่ GIS..."
            className="block w-full pl-12 pr-12 py-4 bg-white/90 backdrop-blur-md border border-neutral-200 rounded-2xl shadow-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm transition-all font-bold text-neutral-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-4 flex items-center px-2 text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-neutral-200">
            {['All', 'Completed', 'In Progress', 'Delayed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  statusFilter === status 
                    ? 'bg-orange-500 text-white shadow-md' 
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                {status === 'All' ? 'ทั้งหมด' : 
                 status === 'Completed' ? 'เสร็จสิ้น' : 
                 status === 'In Progress' ? 'กำลังดำเนินการ' : 'ล่าช้า'}
              </button>
            ))}
          </div>

          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-5 py-2.5 text-xs font-bold text-neutral-700 bg-transparent outline-none cursor-pointer hover:bg-neutral-50 transition-colors appearance-none pr-10 relative"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2352525b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em' }}
            >
              <option value="All">ทุกหมวดหมู่</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Search Results Count Badge */}
        {(searchTerm || statusFilter !== 'All' || typeFilter !== 'All') && (
          <div className="flex justify-start mt-1">
            <span className="px-4 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg animate-in fade-in slide-in-from-left-2 duration-200">
              พบ {filteredProjects.length} {filteredProjects.length === 1 ? 'โครงการ' : 'โครงการ'}
            </span>
          </div>
        )}
      </div>

      {/* Map Info Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">GIS Information</p>
            <p className="text-xs font-bold">ระบบสารสนเทศภูมิศาสตร์</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-[10px] font-bold text-slate-300 uppercase">เสร็จสิ้น</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-[10px] font-bold text-slate-300 uppercase">กำลังดำเนินการ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-[10px] font-bold text-slate-300 uppercase">ล่าช้า</span>
          </div>
        </div>
      </div>

      <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="แผนที่ถนน (Street Map)">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="แผนที่ดาวเทียม (Satellite Map)">
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay name="ผังเมือง / ผังชุมชน (City Plan)">
            <LayerGroup>
              {/* Simulated City Plan Zones */}
              <Circle 
                center={[16.05, 103.65]} 
                radius={2000} 
                pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 0.1 }} 
              />
              <Circle 
                center={[16.06, 103.66]} 
                radius={1500} 
                pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }} 
              />
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          iconCreateFunction={createClusterCustomIcon}
        >
          {filteredProjects.map((project) => (
            <Marker 
              key={project.id} 
              position={[project.lat, project.lng]}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[260px] animate-in fade-in zoom-in duration-200">
                  <div className="flex flex-col mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Project Name</span>
                      <span className="text-[10px] font-mono text-neutral-400">#{project.id}</span>
                    </div>
                    <h3 className="font-black text-neutral-900 text-base leading-tight">
                      {project.name}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">หมวดหมู่</span>
                      <p className="text-xs font-bold text-neutral-700">{project.type}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">งบประมาณ</span>
                      <p className="text-xs font-black text-neutral-900">{formatCurrency(project.budget)}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        {project.status === 'In Progress' ? 'กำลังดำเนินการ' : 
                         project.status === 'Completed' ? 'เสร็จสิ้น' : 
                         project.status === 'Delayed' ? 'ล่าช้า' : project.status}
                      </div>
                      <span className="text-xs font-black text-neutral-900">{project.progress}%</span>
                    </div>
                    
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          project.progress === 100 ? 'bg-green-500' : 
                          project.status === 'Delayed' ? 'bg-red-500' : 'bg-slate-900'
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-tighter">อัปเดตล่าสุด</span>
                      <span className="text-[10px] font-bold text-neutral-600">
                        {format(new Date(project.updatedAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <Link 
                      to={`/projects/${project.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-orange-600 transition-all shadow-lg"
                    >
                      ดูรายละเอียด
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default PublicGISMap;
