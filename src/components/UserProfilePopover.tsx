import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserProfilePopoverProps {
  className?: string;
  onSignOutSuccess?: () => void;
}

export const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({
  className = '',
  onSignOutSuccess,
}) => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (!user) return null;

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Learner';

  const avatarUrl = user.user_metadata?.avatar_url || null;
  const initial = (displayName[0] || user.email?.[0] || 'U').toUpperCase();

  // Mouse hover handlers for desktop
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  // Click outside to close (especially for mobile tap)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSignOutClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSigningOut(true);
    try {
      await signOut();
      setIsOpen(false);
      if (onSignOutSuccess) {
        onSignOutSuccess();
      }
    } catch (err) {
      console.error('Sign-out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Profile Picture Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 p-0.5 rounded-full ring-2 ring-emerald-600/40 hover:ring-emerald-600 transition-all cursor-pointer focus:outline-none"
        title={`${displayName} (${user.email})`}
        aria-expanded={isOpen}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover shadow-2xs"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            {initial}
          </div>
        )}
      </button>

      {/* Popover Dropdown (Visible on hover and on click) */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-stone-200/90 shadow-xl p-3.5 z-50 flex flex-col gap-3 animate-fadeIn text-[#242926]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* User Info Card */}
          <div className="flex items-center gap-3 pb-2.5 border-b border-stone-100">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover border border-emerald-600/30 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-900 truncate block">
                  {displayName}
                </span>
              </div>
              <span className="text-[11px] text-stone-500 block truncate" title={user.email}>
                {user.email}
              </span>
              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Google 계정 연동
              </span>
            </div>
          </div>

          {/* Sign Out Action Button */}
          <button
            type="button"
            onClick={handleSignOutClick}
            disabled={isSigningOut}
            className="w-full min-h-[38px] rounded-xl flex items-center justify-center gap-2 px-3 py-2 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 text-xs font-semibold border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isSigningOut ? '로그아웃 중...' : 'Sign out / 로그아웃'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
