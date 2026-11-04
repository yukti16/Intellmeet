import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { FileText, Plus, ExternalLink, Trash2, BookOpen, Link as LinkIcon } from 'lucide-react';

export const WorkspaceResources = ({
  resources = [],
  currentUserId,
  isWorkspaceAdmin,
  onAddResource,
  onDeleteResource,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('note');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Resource title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onAddResource({
        title: trimmedTitle,
        content: content.trim(),
        category,
        linkUrl: linkUrl.trim(),
      });
      setTitle('');
      setContent('');
      setCategory('note');
      setLinkUrl('');
      setIsModalOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to add resource');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'link':
        return <LinkIcon className="w-4 h-4 text-sky-400" />;
      case 'guideline':
        return <BookOpen className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Workspace Resources & Documents</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Meeting notes, documentation, project guidelines, and reference links
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Add Resource
        </Button>
      </div>

      {resources.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
          <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-300">No resources added yet</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Share guidelines, meeting summaries, or links with your workspace members.
          </p>
          <Button onClick={() => setIsModalOpen(true)} variant="secondary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add First Resource
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((res) => {
            const isCreator = res.createdBy?._id === currentUserId || res.createdBy === currentUserId;
            const canDelete = isCreator || isWorkspaceAdmin;

            return (
              <div
                key={res._id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-800 rounded-lg">
                        {getCategoryIcon(res.category)}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {res.category}
                      </span>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => onDeleteResource(res._id, res.title)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white mb-1.5 line-clamp-1">{res.title}</h4>

                  {res.content && (
                    <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                      {res.content}
                    </p>
                  )}

                  {res.linkUrl && (
                    <a
                      href={res.linkUrl.startsWith('http') ? res.linkUrl : `https://${res.linkUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-brand-400 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open Resource Link
                    </a>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>By {res.createdBy?.name || 'Member'}</span>
                  <span>{new Date(res.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Resource Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Workspace Resource">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Resource Title *"
            placeholder="e.g. Q4 Sprint Playbook, API Spec Document"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="note">Meeting Note / Summary</option>
                <option value="document">Documentation</option>
                <option value="guideline">Team Guideline</option>
                <option value="link">External Reference Link</option>
              </select>
            </div>

            <Input
              label="External Link URL (Optional)"
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Notes / Description
            </label>
            <textarea
              rows="4"
              placeholder="Add meeting notes, instructions or key takeaways..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/70 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Resource'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
