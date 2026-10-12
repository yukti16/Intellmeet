import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { actionItemService } from '../../services/actionItemService';
import { userService } from '../../services/userService';

export const CreateActionItemModal = ({ isOpen, onClose, meetingId, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      userService.getUsers().then((res) => {
        setUsers(res.users || []);
      }).catch(err => console.error(err));
      
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setDueDate(future.toISOString().slice(0, 10));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await actionItemService.createActionItem({
        meeting: meetingId,
        title,
        description,
        assignedTo: assignedTo || null,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      onClose();
      if (onCreated) onCreated(res.actionItem);
    } catch (err) {
      setError(err.message || 'Failed to create action item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Action Item">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <Input
          label="Action Title *"
          placeholder="e.g. Prepare Q4 engineering API documentation"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

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
              <option value="">Assign Member...</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.jobTitle})
                </option>
              ))}
            </select>
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

        <Input
          label="Due Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Add Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};
