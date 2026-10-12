import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { workspaceService } from '../../services/workspaceService';
import { meetingService } from '../../services/meetingService';
import { useNavigate } from 'react-router-dom';

export const CreateMeetingModal = ({ isOpen, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(30);
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      workspaceService.getWorkspaces().then((res) => {
        setWorkspaces(res.workspaces || []);
      }).catch(err => console.error(err));
      
      // Default scheduledAt to current time
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setScheduledAt(now.toISOString().slice(0, 16));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Meeting title is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await meetingService.createMeeting({
        title,
        description,
        workspace: workspace || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        duration: Number(duration),
      });

      onClose();
      if (onCreated) onCreated(res.meeting);
      navigate(`/meetings/${res.meeting._id}`);
    } catch (err) {
      setError(err.message || 'Failed to create meeting');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create / Schedule New Meeting">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <Input
          label="Meeting Title *"
          placeholder="e.g. Q4 Architecture & Security Review"
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
            placeholder="Add key objectives or meeting agenda..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Workspace (Optional)
            </label>
            <select
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="">Personal / General Room</option>
              {workspaces.map((ws) => (
                <option key={ws._id} value={ws._id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Duration (Minutes)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="45">45 Minutes</option>
              <option value="60">60 Minutes (1 Hour)</option>
              <option value="90">90 Minutes</option>
            </select>
          </div>
        </div>

        <Input
          label="Schedule Date & Time"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Generate Meeting Code & Link
          </Button>
        </div>
      </form>
    </Modal>
  );
};
