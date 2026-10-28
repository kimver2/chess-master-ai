import React from 'react';
import { Crown, Sparkles, Shield, Compass, Swords, CircleUser } from 'lucide-react';
import { AvatarType, AvatarColor } from '../types/profile';

interface AvatarIconProps {
  avatar: AvatarType;
  color: AvatarColor;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const COLOR_CLASSES: Record<AvatarColor, { bg: string; text: string; border: string }> = {
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/50' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/50' },
};

export const AvatarIcon: React.FC<AvatarIconProps> = ({
  avatar,
  color,
  className = '',
  size = 'md',
}) => {
  const colorScheme = COLOR_CLASSES[color] || COLOR_CLASSES.amber;

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs border',
    md: 'w-9 h-9 text-sm border',
    lg: 'w-12 h-12 text-lg border-2',
    xl: 'w-16 h-16 text-2xl border-2',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  }[size];

  const renderIcon = () => {
    switch (avatar) {
      case 'king':
        return <Crown className={iconSizes} />;
      case 'queen':
        return <Sparkles className={iconSizes} />;
      case 'knight':
        return <span className="font-serif font-black select-none leading-none">♞</span>;
      case 'rook':
        return <Shield className={iconSizes} />;
      case 'bishop':
        return <Compass className={iconSizes} />;
      case 'pawn':
        return <Swords className={iconSizes} />;
      default:
        return <CircleUser className={iconSizes} />;
    }
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${colorScheme.bg} ${colorScheme.text} ${colorScheme.border} ${sizeClasses} ${className}`}
    >
      {renderIcon()}
    </div>
  );
};
