import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { actionItemService } from '../../services/actionItemService';
import { userService } from '../../services/userService';
import { Clock, AlertCircle, CheckCircle2, Video, CheckSquare, Trash2 } from 'lucide-react';

export const EditActionItemModal = ({ isOpen, onClose, actionItem, onUpdated, onDeleted }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Pending');
  const [dueDate, setDueDate] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen && actionItem) {
      setTitle(actionItem.title || '');
      setDescription(actionItem.description || '');
      setAssignedTo(actionItem.assignedTo?._id || actionItem.assignedTo || '');
      setPriority(actionItem.priority || 'Medium');
      setStatus(actionItem.status || 'Pending');
      if (actionItem.dueDate) {
        setDueDate(new Date(actionItem.dueDate).toISOString().slice(0, 10));
      } else {
        setDueDate('');
      }
      setError('');
      setConfirmDelete(false);

      userService
        .getUsers()
        .then((res) => {
          setUsers(res.users || []);
        })
        .catch((err) => console.error('[EditActionItemModal] Fetch users error:', err));
    }
  }, [isOpen, actionItem]);

  if (!actionItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Action item title is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload = {
        title: trimmedTitle,
        description: description.trim(),
        assignedTo: assignedTo || null,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      };

      const res = await actionItemService.updateActionItem(actionItem._id, payload);
      toast.success('Action item updated successfully');
      if (onUpdated) onUpdated(res.actionItem);
      onClose();
    } catch (err) {
      const msg = err.message || 'Failed to update action item';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    try {
      await actionItemService.deleteActionItem(actionItem._id);
      toast.success('Action item deleted successfully');
      if (onDeleted) onDeleted(actionItem._id);
      onClose();
    } catch (err) {
      const msg = err.message || 'Failed to delete action item';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const statusIcons = {
    Pending: <Clock className="w-4 h-4 text-amber-400" />,
    'In Progress': <AlertCircle className="w-4 h-4 text-sky-400" />,
    Completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Action Item">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Association Context Banner */}
        <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Context:</span>
            {actionItem.meeting ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-md">
                <Video className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">
                  {typeof actionItem.meeting === 'object'
                    ? actionItem.meeting.title || actionItem.meeting.meetingCode || 'Meeting Linked'
                    : 'Meeting Linked'}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-medium bg-slate-800 text-slate-300 border border-slate-700/60 rounded-md">
                <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>Standalone Task</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>Created: {new Date(actionItem.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Title */}
        <Input
          label="Action Title *"
          placeholder="e.g. Prepare Q4 engineering API documentation"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {/* Status & Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Status *
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <div className="absolute left-3 top-3 pointer-events-none">
                {statusIcons[status]}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Description
          </label>
          <textarea
            rows="3"
            placeholder="Details about expected output or deliverable..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Assigned To & Due Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Assigned To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.jobTitle})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                >
                  Confirm Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 py-2 px-1 transition-colors"
                title="Delete this action item"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
