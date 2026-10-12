import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await notificationService.getNotifications();
      setNotifications(res.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAll = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (isLoading) return <LoadingSpinner label="Loading notifications..." />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Notification Center</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time alerts for meetings, action items, and summaries</p>
        </div>

        <Button onClick={handleMarkAll} variant="secondary" size="sm">
          <CheckCheck className="w-4 h-4 mr-1.5" /> Mark All as Read
        </Button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 overflow-hidden shadow-xl">
        {notifications.length === 0 ? (
          <p className="p-12 text-center text-xs text-slate-500">No notifications found.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => n.link && navigate(n.link)}
              className={`p-4 flex items-start gap-4 cursor-pointer hover:bg-slate-800/60 transition-colors ${
                !n.read ? 'bg-slate-800/30' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{n.title}</h4>
                  <span className="text-[10px] text-slate-500">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
