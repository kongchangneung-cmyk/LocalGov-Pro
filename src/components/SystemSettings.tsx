import React, { useState } from 'react';
import { db, collection, onSnapshot, query, orderBy } from '../firebase';
import { 
  Settings, 
  Database, 
  Globe, 
  Download, 
  Upload, 
  Shield, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  Server
} from 'lucide-react';

const SystemSettings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'database' | 'public' | 'backup'>('database');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Database Settings State
  const [dbSettings, setDbSettings] = useState({
    apiEndpoint: 'https://api.localgov.go.th/v1',
    apiKey: '••••••••••••••••',
    syncInterval: '30',
    autoBackup: true
  });

  // Public Dashboard Settings State
  const [publicSettings, setPublicSettings] = useState({
    enabled: true,
    showBudget: true,
    showProgress: true,
    showMap: true,
    theme: 'light',
    refreshRate: '60'
  });

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 1500);
  };

  const handleBackup = async () => {
    // In a real app, this would fetch all collections and create a JSON blob
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data: {
        projects: [], // Mock data
        inspections: [],
        budgets: []
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `localgov_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 tracking-tight">ตั้งค่าระบบและสำรองข้อมูล</h2>
          <p className="text-neutral-500 font-medium">จัดการการเชื่อมต่อฐานข้อมูล แดชบอร์ดสาธารณะ และการสำรองข้อมูล</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
            isSaving ? 'bg-neutral-400 cursor-not-allowed' : 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-neutral-900/20'
          }`}
        >
          {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>
      </div>

      {saveStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-center gap-3 text-green-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold">บันทึกการตั้งค่าเรียบร้อยแล้ว</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveSection('database')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeSection === 'database' ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/10' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            <Database className="w-5 h-5" />
            เชื่อมต่อฐานข้อมูล
          </button>
          <button 
            onClick={() => setActiveSection('public')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeSection === 'public' ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/10' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            <Globe className="w-5 h-5" />
            แดชบอร์ดสาธารณะ
          </button>
          <button 
            onClick={() => setActiveSection('backup')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeSection === 'backup' ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-900/10' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            <Download className="w-5 h-5" />
            สำรองและกู้คืนข้อมูล
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
          {activeSection === 'database' && (
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Server className="text-blue-600 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-900">การเชื่อมต่อฐานข้อมูลภายนอก</h3>
                  <p className="text-sm text-neutral-500">ตั้งค่าการดึงข้อมูลจากระบบส่วนกลาง</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">API Endpoint URL</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none font-mono text-sm"
                    value={dbSettings.apiEndpoint}
                    onChange={e => setDbSettings({...dbSettings, apiEndpoint: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">API Key / Access Token</label>
                  <input 
                    type="password" 
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none font-mono text-sm"
                    value={dbSettings.apiKey}
                    onChange={e => setDbSettings({...dbSettings, apiKey: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ความถี่ในการซิงค์ (นาที)</label>
                    <select 
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 outline-none"
                      value={dbSettings.syncInterval}
                      onChange={e => setDbSettings({...dbSettings, syncInterval: e.target.value})}
                    >
                      <option value="5">ทุก 5 นาที</option>
                      <option value="15">ทุก 15 นาที</option>
                      <option value="30">ทุก 30 นาที</option>
                      <option value="60">ทุก 1 ชั่วโมง</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-8">
                    <input 
                      type="checkbox" 
                      id="autoBackup"
                      className="w-5 h-5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                      checked={dbSettings.autoBackup}
                      onChange={e => setDbSettings({...dbSettings, autoBackup: e.target.checked})}
                    />
                    <label htmlFor="autoBackup" className="text-sm font-bold text-neutral-700">สำรองข้อมูลอัตโนมัติหลังซิงค์</label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'public' && (
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
                  <Globe className="text-purple-600 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-900">การตั้งค่าแดชบอร์ดสาธารณะ</h3>
                  <p className="text-sm text-neutral-500">ควบคุมข้อมูลที่จะแสดงให้ประชาชนเข้าถึง</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <div>
                    <p className="font-bold text-neutral-900">เปิดใช้งานแดชบอร์ดสาธารณะ</p>
                    <p className="text-xs text-neutral-500">อนุญาตให้บุคคลภายนอกเข้าชมข้อมูลภาพรวม</p>
                  </div>
                  <button 
                    onClick={() => setPublicSettings({...publicSettings, enabled: !publicSettings.enabled})}
                    className={`w-14 h-8 rounded-full transition-all relative ${publicSettings.enabled ? 'bg-green-500' : 'bg-neutral-300'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${publicSettings.enabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'showBudget', label: 'แสดงงบประมาณรวม' },
                    { id: 'showProgress', label: 'แสดงความก้าวหน้าโครงการ' },
                    { id: 'showMap', label: 'แสดงแผนที่โครงการ' }
                  ].map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-4 border border-neutral-100 rounded-2xl">
                      <input 
                        type="checkbox" 
                        id={item.id}
                        className="w-5 h-5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        checked={publicSettings[item.id as keyof typeof publicSettings] as boolean}
                        onChange={e => setPublicSettings({...publicSettings, [item.id]: e.target.checked})}
                      />
                      <label htmlFor={item.id} className="text-sm font-bold text-neutral-700">{item.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'backup' && (
            <div className="p-8 space-y-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <Shield className="text-orange-600 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-neutral-900">การสำรองและกู้คืนข้อมูล</h3>
                  <p className="text-sm text-neutral-500">ป้องกันข้อมูลสูญหายด้วยการสำรองข้อมูลอย่างสม่ำเสมอ</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border border-neutral-200 rounded-3xl space-y-4 hover:border-neutral-900 transition-all group">
                  <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center group-hover:bg-neutral-900 transition-all">
                    <Download className="text-neutral-600 w-6 h-6 group-hover:text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-neutral-900">สำรองข้อมูล (Export)</h4>
                    <p className="text-xs text-neutral-500 mt-1">ดาวน์โหลดข้อมูลทั้งหมดในรูปแบบ JSON</p>
                  </div>
                  <button 
                    onClick={handleBackup}
                    className="w-full py-3 bg-neutral-100 text-neutral-900 rounded-xl font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-2"
                  >
                    <FileJson className="w-4 h-4" />
                    เริ่มการสำรองข้อมูล
                  </button>
                </div>

                <div className="p-6 border border-neutral-200 rounded-3xl space-y-4 hover:border-neutral-900 transition-all group">
                  <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center group-hover:bg-neutral-900 transition-all">
                    <Upload className="text-neutral-600 w-6 h-6 group-hover:text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-neutral-900">กู้คืนข้อมูล (Restore)</h4>
                    <p className="text-xs text-neutral-500 mt-1">อัปโหลดไฟล์สำรองเพื่อกู้คืนข้อมูลระบบ</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept=".json"
                    />
                    <button className="w-full py-3 bg-neutral-100 text-neutral-900 rounded-xl font-bold hover:bg-neutral-200 transition-all flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      เลือกไฟล์เพื่อกู้คืน
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-800">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">คำเตือนด้านความปลอดภัย</p>
                  <p className="text-xs mt-1">การกู้คืนข้อมูลจะเขียนทับข้อมูลปัจจุบันทั้งหมด โปรดตรวจสอบให้แน่ใจว่าไฟล์สำรองข้อมูลมีความถูกต้องก่อนดำเนินการ</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
