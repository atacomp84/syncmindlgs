import React from 'react';
import { Award, Star, Shield } from 'lucide-react';

interface Badge {
  id: string;
  user_id: string;
  teacher_id: string;
  badge_type: 'SÜPER' | 'MEGA' | 'UZMAN';
}

interface BadgeDisplayProps {
  badges: Badge[];
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badges }) => {
  const superBadges = badges.filter(badge => badge.badge_type === 'SÜPER').length;
  const megaBadges = badges.filter(badge => badge.badge_type === 'MEGA').length;
  const uzmanBadges = badges.filter(badge => badge.badge_type === 'UZMAN').length;

  return (
    <div className="flex items-center justify-center gap-2 px-2 py-1 rounded-lg shadow-sm border bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex-shrink-0 h-10 flex-nowrap">
      <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 justify-center w-auto sm:flex-1 sm:min-w-[100px] sm:py-1 sm:px-2">
        <Award className="h-5 w-5 text-blue-600" />
        <span className="text-base font-bold text-blue-600">{superBadges}</span>
        <span className="hidden sm:inline text-sm font-medium text-blue-600 whitespace-nowrap">SÜPER</span>
      </div>
      <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 justify-center w-auto sm:flex-1 sm:min-w-[100px] sm:py-1">
        <Star className="h-5 w-5 text-purple-600" />
        <span className="text-base font-bold text-purple-600">{megaBadges}</span>
        <span className="hidden sm:inline text-sm font-medium text-purple-600 whitespace-nowrap">MEGA</span>
      </div>
      <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 justify-center w-auto sm:flex-1 sm:min-w-[100px] sm:py-1">
        <Shield className="h-5 w-5 text-amber-600" />
        <span className="text-base font-bold text-amber-600">{uzmanBadges}</span>
        <span className="hidden sm:inline text-sm font-medium text-amber-600 whitespace-nowrap">UZMAN</span>
      </div>
    </div>
  );
};

export default BadgeDisplay;