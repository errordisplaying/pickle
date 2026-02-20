import { Calendar, Heart, User, ShoppingCart, Target, LogOut, Cloud, CloudOff } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { SavedRecipe, ShoppingItem, UserProfile } from '@/types';

interface NavbarProps {
  mode: 'recipe' | 'testKitchen';
  setMode: (mode: 'recipe' | 'testKitchen') => void;
  favorites: SavedRecipe[];
  shoppingList: ShoppingItem[];
  session: Session | null;
  userProfile: UserProfile | null;
  cloudSyncing: boolean;
  onOpenPlanner: () => void;
  onOpenShoppingList: () => void;
  onOpenFavorites: () => void;
  onOpenGoalsSettings: () => void;
  onOpenAuth: () => void;
  onSyncToCloud: () => void;
  onSignOut: () => void;
}

export default function Navbar({
  mode,
  setMode,
  favorites,
  shoppingList,
  session,
  userProfile,
  cloudSyncing,
  onOpenPlanner,
  onOpenShoppingList,
  onOpenFavorites,
  onOpenGoalsSettings,
  onOpenAuth,
  onSyncToCloud,
  onSignOut,
}: NavbarProps) {
  return (
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 flex items-center justify-between bg-[#F4F2EA]/80 backdrop-blur-md h-16">
        <div className="flex items-center gap-2">
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm" aria-label="Chickpea logo">
            <ellipse cx="32" cy="34" rx="26" ry="24" fill="#D4A96A" />
            <ellipse cx="32" cy="34" rx="26" ry="24" fill="url(#chickpea-grad)" />
            <path d="M32 14 C30 22, 26 30, 28 54" stroke="#C49555" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
            <ellipse cx="24" cy="28" rx="8" ry="5" fill="white" opacity="0.18" transform="rotate(-20 24 28)" />
            <circle cx="32" cy="12" r="5" fill="#8B9E6B" />
            <circle cx="28" cy="10" r="3.5" fill="#7A8E5C" />
            <defs>
              <radialGradient id="chickpea-grad" cx="0.35" cy="0.3" r="0.7">
                <stop offset="0%" stopColor="#E8C088" />
                <stop offset="100%" stopColor="#B8864A" />
              </radialGradient>
            </defs>
          </svg>
          <span className="font-bold text-lg text-[#1A1A1A] tracking-tight">Chickpea</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => setMode('recipe')} className={`text-sm font-medium transition-colors ${mode === 'recipe' ? 'text-[#8B7355]' : 'text-[#6E6A60] hover:text-[#1A1A1A]'}`}>
            Recipes
          </button>
          <button onClick={() => setMode('testKitchen')} className={`text-sm font-medium transition-colors ${mode === 'testKitchen' ? 'text-[#8B7355]' : 'text-[#6E6A60] hover:text-[#1A1A1A]'}`}>
            Test Kitchen
          </button>
          <button onClick={() => onOpenPlanner()} className="text-sm font-medium text-[#6E6A60] hover:text-[#1A1A1A] transition-colors">
            <Calendar className="w-5 h-5" />
          </button>
          <button onClick={() => onOpenShoppingList()} className="text-sm font-medium text-[#6E6A60] hover:text-[#1A1A1A] transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
            {shoppingList.filter(i => !i.purchased).length > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-[#8B7355] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {shoppingList.filter(i => !i.purchased).length}
              </span>
            )}
          </button>
          <button onClick={() => onOpenFavorites()} className="text-sm font-medium text-[#6E6A60] hover:text-[#1A1A1A] transition-colors relative">
            <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'fill-red-400 text-red-400' : ''}`} />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </button>
          <button onClick={() => onOpenGoalsSettings()} className="text-sm font-medium text-[#6E6A60] hover:text-[#1A1A1A] transition-colors">
            <Target className="w-5 h-5" />
          </button>
          {session?.user ? (
            <div className="relative group">
              <button
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#8B7355] hover:border-[#6B5740] transition-colors flex items-center justify-center bg-[#8B7355] text-white text-xs font-bold"
              >
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  (userProfile?.display_name || session.user.email || '?')[0].toUpperCase()
                )}
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E8E6DC] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[300] p-3">
                <div className="px-2 py-2 border-b border-[#E8E6DC] mb-2">
                  <p className="text-xs font-semibold text-[#1A1A1A] truncate">{userProfile?.display_name || 'User'}</p>
                  <p className="text-[10px] text-[#6E6A60] truncate">{session.user.email}</p>
                </div>
                <button
                  onClick={onSyncToCloud}
                  disabled={cloudSyncing}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs text-[#6E6A60] hover:text-[#1A1A1A] hover:bg-[#F4F2EA] rounded-lg transition-colors"
                >
                  {cloudSyncing ? <Cloud className="w-4 h-4 animate-pulse" /> : <Cloud className="w-4 h-4" />}
                  {cloudSyncing ? 'Syncing...' : 'Sync to Cloud'}
                </button>
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center gap-2 px-2 py-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth()}
              className="text-sm font-medium text-[#6E6A60] hover:text-[#1A1A1A] transition-colors relative"
            >
              <User className="w-5 h-5" />
              {!isSupabaseConfigured() && (
                <CloudOff className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-[#6E6A60]" />
              )}
            </button>
          )}
        </div>
      </nav>
  );
}
