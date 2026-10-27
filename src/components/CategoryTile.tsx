import React from 'react';
import { CategoryCardInfo } from '../types';
import { Briefcase, Home, ShoppingBag, Plus } from 'lucide-react';

interface CategoryTileProps {
  category: CategoryCardInfo;
  onSelect: (category: CategoryCardInfo) => void;
}

export const CategoryTile: React.FC<CategoryTileProps> = ({ category, onSelect }) => {
  const getIcon = () => {
    switch (category.iconName) {
      case 'briefcase':
        return <Briefcase className="w-5 h-5 text-teal-600" />;
      case 'home':
        return <Home className="w-5 h-5 text-amber-600" />;
      case 'shopping-bag':
        return <ShoppingBag className="w-5 h-5 text-blue-600" />;
      default:
        return <Briefcase className="w-5 h-5 text-teal-600" />;
    }
  };

  const getIconBg = () => {
    switch (category.iconName) {
      case 'briefcase':
        return 'bg-teal-50 border-teal-200';
      case 'home':
        return 'bg-amber-50 border-amber-200';
      case 'shopping-bag':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-teal-50 border-teal-200';
    }
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(category)}
      className="group text-left bg-white border border-slate-200 hover:border-teal-500 rounded-xl p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-teal-500"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2.5 rounded-lg border flex items-center justify-center ${getIconBg()}`}>
            {getIcon()}
          </div>
          <span className="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-teal-50 text-slate-400 group-hover:text-teal-600 flex items-center justify-center transition-colors">
            <Plus className="w-4 h-4" />
          </span>
        </div>
        <h4 className="text-base font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
          {category.name}
        </h4>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          {category.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-medium text-teal-700">
        <span>Start this case</span>
      </div>
    </button>
  );
};
