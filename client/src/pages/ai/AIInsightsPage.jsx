import React, { useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { Sparkles, Brain, CheckCircle2, Zap, ArrowRight, Lightbulb, User, Calendar, AlertCircle } from 'lucide-react';

export const AIInsightsPage = () => {
  const [insights, setInsights] = useState(null);
  const [customTranscript, setCustomTranscript] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    aiService.getAIInsights().then((res) => {
      setInsights(res.insights);
      setIsLoading(false);
    }).catch(err => setIsLoading(false));
  }, []);

  const handleCustomSummarize = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customTranscript || !customTranscript.trim()) {
      setErrorMsg('Please enter a meeting transcript to analyze.');
      return;
    }

    setIsProcessing(true);
    setAiResult(null);

    try {
      const res = await aiService.summarizeText(customTranscript.trim());
      if (res && res.summary) {
        setAiResult(res.summary);
      } else {
        setErrorMsg('Failed to generate summary. Please try again.');
      }
    } catch (err) {
      console.error('[AI Playground Error]', err);
      setErrorMsg(err.message || 'An error occurred while communicating with the AI service.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e) => {
    setCustomTranscript(e.target.value);
    if (errorMsg) setErrorMsg('');
  };

  const priorityColors = {
    High: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    Medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  if (isLoading) return <LoadingSpinner label="Compiling AI Analytics & Insights..." />;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-950/50 via-slate-900 to-slate-900 border border-purple-900/30 p-6 sm:p-8 rounded-3xl">
        <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" /> OpenAI Meeting Intelligence Hub
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          AI Meeting Insights & Recommendations
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-2">
          IntellMeet uses GPT processing to automatically summarize conversations, extract decisions, and optimize workspace meeting productivity.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Productivity Score</span>
          <h3 className="text-3xl font-extrabold text-white">{insights?.productivityScore || 92}%</h3>
          <p className="text-[11px] text-emerald-400 font-semibold">High meeting engagement</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Summaries Generated</span>
          <h3 className="text-3xl font-extrabold text-white">{insights?.totalSummariesGenerated || 24}</h3>
          <p className="text-[11px] text-purple-400 font-semibold">100% transcript coverage</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase">Action Items Completed</span>
          <h3 className="text-3xl font-extrabold text-white">{insights?.actionItemCompletionRate || 86}%</h3>
          <p className="text-[11px] text-sky-400 font-semibold">Task execution velocity</p>
        </div>
      </div>

      {/* Top Topics & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-brand-400" /> Frequently Discussed Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {(insights?.topTopics || []).map((tp, i) => (
              <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200">
                #{tp}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" /> Recommended Follow-up Actions
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {(insights?.recommendedFollowUps || []).map((fl, i) => (
              <li key={i} className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>{fl}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Live AI Summary Generator Playground */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-brand-400 font-bold text-sm">
          <Sparkles className="w-4 h-4" /> Live AI Summary Generator Playground
        </div>
        <p className="text-xs text-slate-400">
          Paste any custom transcript or meeting notes below to generate real-time AI executive summaries, key decisions, and explicit action items.
        </p>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleCustomSummarize} className="space-y-4">
          <textarea
            rows="6"
            placeholder="Paste transcript text here (e.g., 'Rahul: We should migrate WebRTC servers to AWS by Friday. Alex: Agreed, I will configure the staging deployment...')"
            value={customTranscript}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
          />

          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" size="md" isLoading={isProcessing}>
              Run AI Analysis Engine <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            {customTranscript && (
              <button
                type="button"
                onClick={() => { setCustomTranscript(''); setAiResult(null); setErrorMsg(''); }}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Clear Input
              </button>
            )}
          </div>
        </form>

        {/* AI Output Rendering */}
        {aiResult && (
          <div className="mt-8 p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-6 animate-fadeIn">
            {/* Executive Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" /> AI Executive Summary Output
              </h4>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900 p-4 rounded-xl border border-slate-800/80">
                {aiResult.executiveSummary}
              </p>
            </div>

            {/* Discussion Points & Decisions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <h5 className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> Main Discussion Points
                </h5>
                <ul className="space-y-1.5 text-slate-300">
                  {aiResult.mainPoints && aiResult.mainPoints.length > 0 ? (
                    aiResult.mainPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-purple-400 font-bold">•</span>
                        <span>{p}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500 italic">No main points extracted.</li>
                  )}
                </ul>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <h5 className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Key Decisions
                </h5>
                <ul className="space-y-1.5 text-slate-300">
                  {aiResult.decisions && aiResult.decisions.length > 0 ? (
                    aiResult.decisions.map((d, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{d}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500 italic">No explicit decisions recorded.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Extracted Action Items */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Extracted Action Items ({aiResult.actionItems?.length || 0})
              </h4>

              {aiResult.actionItems && aiResult.actionItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiResult.actionItems.map((item, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${priorityColors[item.priority] || priorityColors.Medium}`}>
                          {item.priority || 'Medium'} Priority
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" /> Due: {item.dueDate || 'TBD'}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-100">{item.title}</h5>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>Assigned to: <strong className="text-slate-200">{item.assignedTo || 'Unassigned'}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl text-xs text-slate-400 italic text-center">
                  No explicit action items or assigned tasks were mentioned in this transcript.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
