import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('[NotificationBell] Failed to fetch:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      socket.on('new-notification', (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });
    }

    return () => {
      if (socket) socket.off('new-notification');
    };
  }, [socket]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.read) {
      try {
        await notificationService.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {}
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
            <h4 className="text-sm font-bold text-slate-100">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">No notifications yet.</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 cursor-pointer hover:bg-slate-800/60 transition-colors flex items-start gap-3 ${
                    !notif.read ? 'bg-slate-800/30' : ''
                  }`}
                >
                  <div
                    className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                      !notif.read ? 'bg-brand-500' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-semibold text-slate-200 truncate">{notif.title}</h5>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notif.message}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
