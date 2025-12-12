import React from 'react';
import { UserCircle } from 'lucide-react';
import { User } from '../types';

interface UserAvatarProps {
  user: User | undefined | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-lg',
    lg: 'w-16 h-16 text-3xl',
    xl: 'w-24 h-24 text-4xl'
  };

  const baseClasses = `${sizeClasses[size]} rounded-full shadow-sm flex items-center justify-center shrink-0 ${className}`;

  if (!user) {
    return <UserCircle className={`${sizeClasses[size]} text-slate-300 dark:text-slate-600 ${className}`} />;
  }

  // 1. Image URL or Base64
  if (user.avatar && user.avatar.length > 20) {
    return (
      <img 
        src={user.avatar} 
        alt={user.name} 
        className={`${baseClasses} object-cover border border-white dark:border-slate-800 bg-white dark:bg-slate-800`} 
      />
    );
  } 
  
  // 2. Emoji Avatar
  else if (user.avatar) {
    return (
      <div className={`${baseClasses} bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 select-none`}>
        {user.avatar}
      </div>
    );
  }
  
  // 3. Initials Fallback
  return (
     <div className={`${baseClasses} bg-slate-800 dark:bg-slate-700 text-sky-300 border border-slate-700 dark:border-slate-600 font-bold uppercase select-none`}>
        {user.name.charAt(0)}
     </div>
  );
};