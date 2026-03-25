import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Project } from './Dashboard';
import { format } from 'date-fns';
import { CheckCircle2, Clock, AlertCircle, Search, X } from 'lucide-react';

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

interface ProjectMapProps {
  projects: Project[];
}

const ProjectMap: React.FC<ProjectMapProps> = ({ projects }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const center: [number, number] = [13.7563, 100.5018]; // Default to Bangkok

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="h-[600px] w-full relative group/map">
      {/* Search Overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4">
        <div className="relative group/search">
          <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-neutral-400 group-focus-within/search:text-neutral-900 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search projects by name..."
            className="block w-full pl-11 pr-10 py-3 bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-2xl shadow-xl shadow-neutral-900/5 focus:ring-2 focus:ring-neutral-900 focus:border-transparent outline-none text-sm transition-all font-medium"
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
        
        {/* Search Results Count Badge */}
        {searchTerm && (
          <div className="mt-2 flex justify-center">
            <span className="px-3 py-1 bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
              Found {filteredProjects.length} {filteredProjects.length === 1 ? 'Project' : 'Projects'}
            </span>
          </div>
        )}
      </div>

      <MapContainer center={center} zoom={6} scrollWheelZoom={true} className="h-full w-full rounded-2xl">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredProjects.map((project) => (
          <Marker key={project.id} position={[project.lat, project.lng]}>
            <Popup className="custom-popup">
              <div className="p-2 min-w-[200px]">
                <div className="flex flex-col mb-2">
                  <span className="font-bold text-neutral-900 text-sm">{project.name}</span>
                  <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">ID: {project.id}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold">Type</span>
                    <span className="text-xs font-medium">{project.type}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold">Budget</span>
                    <span className="text-xs font-bold">${project.budget.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className={`flex items-center gap-1 text-[10px] font-bold uppercase ${getStatusColor(project.status)}`}>
                    {getStatusIcon(project.status)}
                    {project.status}
                  </div>
                  <span className="text-[10px] font-bold text-neutral-900">{project.progress}%</span>
                </div>

                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      project.progress === 100 ? 'bg-green-500' : 'bg-neutral-900'
                    }`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>

                <div className="pt-2 border-t border-neutral-100">
                  <span className="text-[10px] text-neutral-400">
                    Updated: {format(new Date(project.updatedAt), 'MMM dd, HH:mm')}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ProjectMap;
