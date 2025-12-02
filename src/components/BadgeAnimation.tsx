"use client";

import { useEffect } from 'react';
import './BadgeAnimation.css';
import { cn } from '@/lib/utils';

interface BadgeAnimationProps {
  badgeName: 'SÜPER' | 'MEGA' | 'UZMAN';
  onAnimationEnd: () => void;
}

const BadgeAnimation = ({ badgeName, onAnimationEnd }: BadgeAnimationProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnimationEnd();
    }, 2000); // Animation duration is 2s

    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  const badgeStyles = {
    'SÜPER': 'bg-blue-500',
    'MEGA': 'bg-yellow-500',
    'UZMAN': 'bg-green-500',
  };

  return (
    <div className={cn('badge-animation', badgeStyles[badgeName])}>
      {badgeName} ROZET!
    </div>
  );
};

export default BadgeAnimation;