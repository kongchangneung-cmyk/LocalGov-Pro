import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Rectangle, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Project } from './Dashboard';
import { format } from 'date-fns';
import { CheckCircle2, Clock, AlertCircle, Search, X, ChevronRight, MapPin, Database, MousePointer2, BoxSelect } from 'lucide-react';

const createCustomIcon = (status: string) => {
  const colors = {
    'Completed': '#22c55e', // green-500
    'In Progress': '#3b82f6', // blue-500
    'Delayed': '#ef4444', // red-500
    'default': '#737373' // neutral-500
  };
  
  const ringColors = {
    'Completed': '#4ade80', // green-400
    'In Progress': '#60a5fa', // blue-400
    'Delayed': '#f87171', // red-400
    'default': '#a3a3a3' // neutral-400
  };

  const icons = {
    'Completed': `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    'In Progress': `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    'Delayed': `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    'default': `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`
  };

  const color = colors[status as keyof typeof colors] || colors.default;
  const ringColor = ringColors[status as keyof typeof ringColors] || ringColors.default;
  const iconSvg = icons[status as keyof typeof icons] || icons.default;

  const html = `
    <div class="relative flex items-center justify-center w-10 h-10">
      <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full opacity-40" style="background-color: ${ringColor}"></span>
      <div class="relative inline-flex rounded-full h-7 w-7 border-2 border-white shadow-xl flex items-center justify-center transition-transform hover:scale-125" style="background-color: ${color}">
        ${iconSvg}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-div-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = 'w-10 h-10';
  if (count > 10) size = 'w-12 h-12';
  if (count > 50) size = 'w-14 h-14';

  return L.divIcon({
    html: `<div class="flex items-center justify-center ${size} bg-neutral-900 text-white rounded-full border-4 border-neutral-200 shadow-xl font-black text-sm transition-all hover:scale-110"><span class="drop-shadow-md">${count}</span></div>`,
    className: 'custom-cluster-icon bg-transparent',
    iconSize: L.point(40, 40, true),
  });
};

const ChangeView: React.FC<{ projects: Project[] }> = ({ projects }) => {
  const map = useMap();
  
  useEffect(() => {
    if (projects.length > 0) {
      const bounds = L.latLngBounds(projects.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [projects, map]);

  return null;
};

const SelectionTool: React.FC<{ 
  onSelectionEnd: (bounds: L.LatLngBounds | null) => void,
  active: boolean 
}> = ({ onSelectionEnd, active }) => {
  const [startPos, setStartPos] = useState<L.LatLng | null>(null);
  const [currentPos, setCurrentPos] = useState<L.LatLng | null>(null);
  const map = useMap();

  useMapEvents({
    mousedown: (e) => {
      if (!active) return;
      map.dragging.disable();
      setStartPos(e.latlng);
      setCurrentPos(e.latlng);
    },
    mousemove: (e) => {
      if (!active || !startPos) return;
      setCurrentPos(e.latlng);
    },
    mouseup: () => {
      if (!active || !startPos || !currentPos) {
        setStartPos(null);
        setCurrentPos(null);
        map.dragging.enable();
        return;
      }
      const bounds = L.latLngBounds(startPos, currentPos);
      onSelectionEnd(bounds);
      setStartPos(null);
      setCurrentPos(null);
      map.dragging.enable();
    },
  });

  if (!active || !startPos || !currentPos) return null;

  const bounds = L.latLngBounds(startPos, currentPos);
  return <Rectangle bounds={bounds} pathOptions={{ color: '#f97316', weight: 2, fillOpacity: 0.1, dashArray: '5, 5' }} />;
};

interface ProjectMapProps {
  projects: Project[];
  onMarkerClick?: (projectId: string) => void;
  onSync?: () => void;
}

const ProjectMap: React.FC<ProjectMapProps> = ({ projects, onMarkerClick, onSync }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<L.LatLngBounds | null>(null);
  const center: [number, number] = [16.05, 103.65]; // Default to Roi Et area

  const uniqueTypes = Array.from(new Set(projects.map(p => p.type)));

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
    const matchesType = typeFilter === 'All' || project.type === typeFilter;
    const matchesBounds = !selectionBounds || selectionBounds.contains([project.lat, project.lng]);
    return matchesSearch && matchesStatus && matchesType && matchesBounds;
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
    <div className="h-[600px] w-full relative group/map">
      {/* Search Overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-2xl px-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative group/search flex-1">
            <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400 group-focus-within/search:text-neutral-900 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="ค้นหาโครงการบนแผนที่..."
              className="block w-full pl-11 pr-10 py-3 bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-2xl shadow-xl shadow-neutral-900/5 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-3 flex items-center px-2 text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectionBounds(null);
            }}
            className={`px-4 py-3 rounded-2xl shadow-xl border transition-all flex items-center gap-2 text-sm font-bold ${
              selectionMode 
                ? 'bg-orange-500 text-white border-orange-400' 
                : 'bg-white/95 backdrop-blur-sm text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
            title={selectionMode ? "ยกเลิกการเลือกพื้นที่" : "เลือกพื้นที่เพื่อกรองข้อมูล"}
          >
            {selectionMode ? <X className="w-4 h-4" /> : <BoxSelect className="w-4 h-4" />}
            <span className="hidden sm:inline">{selectionMode ? 'ยกเลิก' : 'เลือกพื้นที่'}</span>
          </button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <div className="flex bg-white/95 backdrop-blur-sm p-1 rounded-xl shadow-lg border border-neutral-200">
            {['All', 'Completed', 'In Progress', 'Delayed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === status 
                    ? 'bg-neutral-900 text-white shadow-md' 
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                {status === 'All' ? 'ทั้งหมด' : 
                 status === 'Completed' ? 'เสร็จสิ้น' : 
                 status === 'In Progress' ? 'กำลังดำเนินการ' : 'ล่าช้า'}
              </button>
            ))}
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 text-xs font-bold text-neutral-700 bg-transparent outline-none cursor-pointer hover:bg-neutral-50 transition-colors appearance-none pr-8 relative"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2352525b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em' }}
            >
              <option value="All">ทุกหมวดหมู่</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Results Count Badge */}
        {(searchTerm || statusFilter !== 'All' || typeFilter !== 'All' || selectionBounds) && (
          <div className="flex justify-center mt-1">
            <span className="px-3 py-1 bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
              พบ {filteredProjects.length} {filteredProjects.length === 1 ? 'โครงการ' : 'โครงการ'}
              {selectionBounds && ' (ในพื้นที่ที่เลือก)'}
            </span>
          </div>
        )}
      </div>

      <MapContainer center={center} zoom={13} scrollWheelZoom={false} className="h-full w-full rounded-2xl">
        <ChangeView projects={filteredProjects} />
        <SelectionTool active={selectionMode} onSelectionEnd={(bounds) => setSelectionBounds(bounds)} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
              icon={createCustomIcon(project.status)}
              eventHandlers={{
                click: () => {
                  // Removed automatic sidebar opening to favor the new Popup for quick details
                  if (onMarkerClick) onMarkerClick(project.id);
                },
              }}
            >
              <Popup className="project-popup">
                <div className="p-1 min-w-[200px] font-sans">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">#{project.id}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${getStatusColor(project.status)} bg-neutral-50`}>
                      {project.status === 'In Progress' ? 'กำลังดำเนินการ' : 
                       project.status === 'Completed' ? 'เสร็จสิ้น' : 
                       project.status === 'Delayed' ? 'ล่าช้า' : project.status}
                    </span>
                  </div>
                  <h3 className="font-black text-neutral-900 text-sm mb-2 leading-tight">{project.name}</h3>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-neutral-400 uppercase">Progress</span>
                      <span className="text-neutral-900">{project.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          project.progress === 100 ? 'bg-green-500' : 
                          project.status === 'Delayed' ? 'bg-red-500' : 'bg-neutral-900'
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-neutral-400 font-bold uppercase">Budget</span>
                      <span className="font-black text-neutral-900">{formatCurrency(project.budget)}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Link 
                        to={`/projects/${project.id}`}
                        className="flex-1 py-2 bg-neutral-900 text-white text-[9px] font-bold uppercase tracking-widest text-center rounded-lg hover:bg-neutral-800 transition-all shadow-sm"
                      >
                        ดูรายละเอียด
                      </Link>
                      <button 
                        onClick={() => setSelectedProject(project)}
                        className="px-3 py-2 bg-neutral-100 text-neutral-900 text-[9px] font-bold uppercase tracking-widest text-center rounded-lg hover:bg-neutral-200 transition-all shadow-sm"
                      >
                        แถบข้าง
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
        {selectionBounds && (
          <Rectangle bounds={selectionBounds} pathOptions={{ color: '#f97316', weight: 2, fillOpacity: 0.1 }} />
        )}
      </MapContainer>

      {/* Admin Controls Overlay */}
      {onSync && (
        <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
          <button 
            onClick={onSync}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-900/90 backdrop-blur-sm text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-neutral-800 shadow-xl transition-all active:scale-95 border border-neutral-700"
            title="ซิงค์ข้อมูลทั้งหมด (สำหรับผู้ดูแลระบบเท่านั้น)"
          >
            <Database className="w-3 h-3" />
            ซิงค์ข้อมูล (ADMIN)
          </button>
        </div>
      )}

      {/* Empty State Overlay */}
      {filteredProjects.length === 0 && (
        <div className="absolute inset-0 z-[1001] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 rounded-2xl">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl border border-neutral-100">
            <Search className="text-neutral-300 w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-neutral-900 tracking-tight">ไม่พบข้อมูลโครงการบนแผนที่</h3>
          <p className="text-neutral-500 max-w-xs mx-auto mt-2 mb-8 font-medium">
            ไม่พบรายการโครงการที่ตรงตามเงื่อนไขการค้นหา หรือยังไม่มีข้อมูลพิกัดในระบบ
          </p>
        </div>
      )}

      {/* Project Details Sidebar */}
      {selectedProject && (
        <div className="absolute top-4 right-4 bottom-4 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-200 z-[1000] flex flex-col overflow-hidden animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-white">
            <h3 className="font-black text-neutral-900 text-sm uppercase tracking-widest">รายละเอียดโครงการ</h3>
            <button 
              onClick={() => setSelectedProject(null)}
              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div className="flex flex-col mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Project Name</span>
                <span className="text-[10px] font-mono text-neutral-400">#{selectedProject.id}</span>
              </div>
              <h3 className="font-black text-neutral-900 text-xl leading-tight">
                {selectedProject.name}
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-1 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Type</span>
                <p className="text-xs font-bold text-neutral-700">{selectedProject.type}</p>
              </div>
              <div className="space-y-1 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Budget</span>
                <p className="text-xs font-black text-neutral-900">{formatCurrency(selectedProject.budget)}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${getStatusColor(selectedProject.status)}`}>
                  {getStatusIcon(selectedProject.status)}
                  {selectedProject.status === 'In Progress' ? 'กำลังดำเนินการ' : 
                   selectedProject.status === 'Completed' ? 'เสร็จสิ้น' : 
                   selectedProject.status === 'Delayed' ? 'ล่าช้า' : selectedProject.status}
                </div>
                <span className="text-xs font-black text-neutral-900">{selectedProject.progress}%</span>
              </div>
              
              <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    selectedProject.progress === 100 ? 'bg-green-500' : 
                    selectedProject.status === 'Delayed' ? 'bg-red-500' : 'bg-neutral-900'
                  }`}
                  style={{ width: `${selectedProject.progress}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Location</span>
              <div className="flex items-start gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                <span className="text-xs font-medium text-neutral-600 leading-relaxed">
                  Lat: {selectedProject.lat.toFixed(4)}, Lng: {selectedProject.lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-neutral-100 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-tighter">Last Updated</span>
                <span className="text-[10px] font-bold text-neutral-600">
                  {format(new Date(selectedProject.updatedAt), 'dd MMM yyyy, HH:mm')}
                </span>
              </div>
            </div>
            <Link 
              to={`/projects/${selectedProject.id}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-neutral-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-900/10 active:scale-[0.98]"
            >
              ดูรายละเอียดเพิ่มเติม
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectMap;
