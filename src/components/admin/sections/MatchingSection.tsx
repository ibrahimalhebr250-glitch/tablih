import { useState } from 'react';
import {
  Brain, Settings, Shield, TrendingUp, Activity,
  FileText, Zap, AlertCircle, Play, Pause
} from 'lucide-react';
import MatchingControlCenter from '../matching/MatchingControlCenter';
import MatchingRulesManager from '../matching/MatchingRulesManager';
import MatchingBlacklist from '../matching/MatchingBlacklist';
import MatchingPerformance from '../matching/MatchingPerformance';
import MatchingPatterns from '../matching/MatchingPatterns';
import ManualInterventionTools from '../matching/ManualInterventionTools';

type TabType = 'control' | 'rules' | 'blacklist' | 'performance' | 'patterns' | 'manual';

export default function MatchingSection() {
  const [activeTab, setActiveTab] = useState<TabType>('control');

  const tabs = [
    { id: 'control' as TabType, label: 'Control Center', icon: Brain, color: '#7C3AED' },
    { id: 'rules' as TabType, label: 'Matching Rules', icon: Settings, color: '#2563EB' },
    { id: 'blacklist' as TabType, label: 'Blacklist', icon: Shield, color: '#DC2626' },
    { id: 'performance' as TabType, label: 'Performance', icon: TrendingUp, color: '#059669' },
    { id: 'patterns' as TabType, label: 'Patterns', icon: Activity, color: '#D97706' },
    { id: 'manual' as TabType, label: 'Manual Tools', icon: Zap, color: '#7C3AED' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">AI Matching Management</h1>
            <p className="text-sm text-gray-600">Control and optimize intelligent matching system</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-green-50 border border-green-200 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-bold text-green-700">AI Active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={
                activeTab === tab.id
                  ? { background: `linear-gradient(135deg, ${tab.color}, ${tab.color}dd)` }
                  : {}
              }
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 'control' && <MatchingControlCenter />}
        {activeTab === 'rules' && <MatchingRulesManager />}
        {activeTab === 'blacklist' && <MatchingBlacklist />}
        {activeTab === 'performance' && <MatchingPerformance />}
        {activeTab === 'patterns' && <MatchingPatterns />}
        {activeTab === 'manual' && <ManualInterventionTools />}
      </div>
    </div>
  );
}
