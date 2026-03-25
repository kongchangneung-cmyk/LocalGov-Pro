import React, { useState, useEffect } from 'react';
import { Project } from './Dashboard';
import { analyzeProjects } from '../services/gemini';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIInsightsProps {
  projects: Project[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ projects }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getInsight = async () => {
    if (projects.length === 0) return;
    setLoading(true);
    try {
      const result = await analyzeProjects(projects);
      setInsight(result || "Unable to generate insights at this time.");
    } catch (error) {
      console.error('Gemini error:', error);
      setInsight("Error generating AI insights. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projects.length > 0 && !insight) {
      getInsight();
    }
  }, [projects]);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 bg-neutral-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="text-white w-5 h-5" />
          <h2 className="text-lg font-bold text-white">AI Project Insights</h2>
        </div>
        <button 
          onClick={getInsight} 
          disabled={loading}
          className="text-white/60 hover:text-white transition-colors disabled:opacity-50"
          title="Refresh Insights"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-sm font-medium animate-pulse">Analyzing project data with Gemini AI...</p>
          </div>
        ) : insight ? (
          <div className="prose prose-sm max-w-none text-neutral-600 prose-headings:text-neutral-900 prose-strong:text-neutral-900">
            <ReactMarkdown>{insight}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-center text-neutral-500 py-8">No data available for AI analysis.</p>
        )}
      </div>
    </div>
  );
};

export default AIInsights;
