import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle2, Trash2 } from 'lucide-react';
import { db, collection, onSnapshot, query, where, orderBy, doc, updateDoc, deleteDoc, writeBatch } from '../firebase';
import { useAuth } from '../useAuth';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
  link?: string;
}

const NotificationDropdown: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Notification[] = [];
      snapshot.forEach((doc) => {
        data.push({ ...doc.data(), id: doc.id } as Notification);
      });
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (n: Notification) => {
    if (!n.read) {
      try {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    if (n.link) {
      navigate(n.link);
      setIsOpen(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 text-neutral-500 hover:bg-neutral-100 rounded-xl transition-all border border-transparent hover:border-neutral-200 relative ${isOpen ? 'bg-neutral-100 border-neutral-200' : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div>
              <h3 className="text-sm font-black text-neutral-900 tracking-tight">การแจ้งเตือน</h3>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">คุณมี {unreadCount} ข้อความใหม่</p>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[10px] font-bold text-neutral-900 uppercase tracking-widest hover:text-neutral-600 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> อ่านทั้งหมด
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-neutral-50">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-4 hover:bg-neutral-50 transition-colors group relative cursor-pointer ${!n.read ? 'bg-blue-50/30' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        n.type === 'warning' ? 'bg-amber-50' : 
                        n.type === 'error' ? 'bg-red-50' : 
                        n.type === 'success' ? 'bg-green-50' : 'bg-blue-50'
                      }`}>
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className={`text-xs font-black truncate ${!n.read ? 'text-neutral-900' : 'text-neutral-600'}`}>
                            {n.title}
                          </h4>
                          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest shrink-0">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: th })}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed line-clamp-2 ${!n.read ? 'text-neutral-700 font-medium' : 'text-neutral-500'}`}>
                          {n.message}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="absolute right-2 bottom-2 p-1.5 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-6 h-6 text-neutral-300" />
                </div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">ไม่มีการแจ้งเตือน</p>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-neutral-100 bg-neutral-50/50 text-center">
              <button className="text-[10px] font-black text-neutral-900 uppercase tracking-widest hover:underline">
                ดูการแจ้งเตือนทั้งหมด
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
