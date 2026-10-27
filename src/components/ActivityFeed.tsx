import React from 'react';
import { ActivityItem } from '../types';
import { History, Upload, CheckCircle2, Share2, Clock } from 'lucide-react';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'upload':
        return <Upload className="w-3.5 h-3.5 text-teal-600" />;
      case 'verify':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'share':
        return <Share2 className="w-3.5 h-3.5 text-blue-600" />;
      case 'expiry_warning':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <History className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getIconBackground = (type: ActivityItem['type']) => {
    switch (type) {
      case 'upload':
        return 'bg-teal-50 border-teal-200';
      case 'verify':
        return 'bg-emerald-50 border-emerald-200';
      case 'share':
        return 'bg-blue-50 border-blue-200';
      case 'expiry_warning':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-600" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">
            Recent activity
          </h3>
        </div>
        <span className="text-xs font-medium text-slate-500">Latest updates</span>
      </div>

      <div className="relative pl-3 space-y-5 flex-1">
        {/* Vertical timeline connector */}
        <div
          className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-slate-200 -z-0"
          aria-hidden="true"
        />

        {activities.map((item) => (
          <div key={item.id} className="relative flex items-start gap-3 text-xs sm:text-sm">
            {/* Timeline icon node */}
            <div
              className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 z-10 ${getIconBackground(
                item.type
              )}`}
              aria-hidden="true"
            >
              {getActivityIcon(item.type)}
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5 min-w-0">
              <p
                className={`text-xs sm:text-sm leading-relaxed ${
                  item.expiryWarning ? 'font-medium text-amber-900' : 'text-slate-800'
                }`}
              >
                {item.description}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                <span>{item.timestamp}</span>
                <span>•</span>
                <span className="truncate">{item.caseTitle}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
