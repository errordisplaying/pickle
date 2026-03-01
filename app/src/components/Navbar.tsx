import { useState } from 'react';
import { Calendar, Heart, User, ShoppingCart, Target, LogOut, Cloud, CloudOff, Menu, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 flex items-center justify-between bg-[#F4F2EA]/80 backdrop-blur-md h-16">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="flex items-center gap-2 cursor-pointer"
          aria-label="chickpea — back to home"
        >
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm" aria-label="chickpea logo">
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
          <span className="font-bold text-lg text-[#1A1A1A] tracking-tight">chickpea</span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => setMode('recipe')} className={`text-sm font-medium transition-colors ${mode === 'recipe' ? 'text-[#C49A5C]' : 'text-[#6E6A60] hover:text-[#1A1A1A]'}`}>
            Recipes
          </button>
          <button onClick={() => setMode('testKitchen')} className={`text-sm font-medium transition-colors ${mode === 'testKitchen' ? 'text-[#C49A5C]' : 'text-[#6E6A60] hover:text-[#1A1A1A]'}`}>
            Test Kitchen
          </button>
          <button data-tour="planner" onClick={() => onOpenPlanner()} className="text-sm font-medium text-[#6E6A60] hover:text-[#1A1A1A] transition-colors">
            <Calendar className="w-5 h-5" />
          </button>
          <button onClick={() => onOpenShoppingList()} className="text-sm font-medium text-[#6E6A60] hover:text-[#1A1A1A] transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
            {shoppingList.filter(i => !i.purchased).length > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-[#C49A5C] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {shoppingList.filter(i => !i.purchased).length}
              </span>
            )}
          </button>
          <button data-tour="favorites" onClick={() => onOpenFavorites()} className="text-sm font-medium text-[#6E6A60] hover:text-[#1A1A1A] transition-colors relative">
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
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#C49A5C] hover:border-[#8B6F3C] transition-colors flex items-center justify-center bg-[#C49A5C] text-white text-xs font-bold"
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

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-[#6E6A60] hover:text-[#1A1A1A] transition-colors p-1"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={closeMobile} />

          {/* Menu Panel */}
          <div className="absolute top-16 right-0 w-64 bg-[#F4F2EA] border-l border-black/5 shadow-xl rounded-bl-3xl overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-4 space-y-1">
              {/* Mode Buttons */}
              <button
                onClick={() => { setMode('recipe'); closeMobile(); }}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${mode === 'recipe' ? 'bg-[#C49A5C] text-white' : 'text-[#6E6A60] hover:bg-[#E8E6DC]'}`}
              >
                Recipes
              </button>
              <button
                onClick={() => { setMode('testKitchen'); closeMobile(); }}
                className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${mode === 'testKitchen' ? 'bg-[#C49A5C] text-white' : 'text-[#6E6A60] hover:bg-[#E8E6DC]'}`}
              >
                Test Kitchen
              </button>

              <div className="border-t border-black/5 my-2" />

              {/* Tool Buttons */}
              <button
                onClick={() => { onOpenPlanner(); closeMobile(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[#6E6A60] hover:bg-[#E8E6DC] transition-colors"
              >
                <Calendar className="w-5 h-5" /> Meal Planner
              </button>
              <button
                onClick={() => { onOpenShoppingList(); closeMobile(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[#6E6A60] hover:bg-[#E8E6DC] transition-colors relative"
              >
                <ShoppingCart className="w-5 h-5" /> Shopping List
                {shoppingList.filter(i => !i.purchased).length > 0 && (
                  <span className="ml-auto w-5 h-5 bg-[#C49A5C] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {shoppingList.filter(i => !i.purchased).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { onOpenFavorites(); closeMobile(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[#6E6A60] hover:bg-[#E8E6DC] transition-colors"
              >
                <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'fill-red-400 text-red-400' : ''}`} /> Favorites
                {favorites.length > 0 && (
                  <span className="ml-auto w-5 h-5 bg-red-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { onOpenGoalsSettings(); closeMobile(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[#6E6A60] hover:bg-[#E8E6DC] transition-colors"
              >
                <Target className="w-5 h-5" /> Nutrition Goals
              </button>

              <div className="border-t border-black/5 my-2" />

              {/* Auth */}
              {session?.user ? (
                <>
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-[#1A1A1A] truncate">{userProfile?.display_name || 'User'}</p>
                    <p className="text-[10px] text-[#6E6A60] truncate">{session.user.email}</p>
                  </div>
                  <button
                    onClick={() => { onSyncToCloud(); closeMobile(); }}
                    disabled={cloudSyncing}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[#6E6A60] hover:bg-[#E8E6DC] transition-colors"
                  >
                    {cloudSyncing ? <Cloud className="w-5 h-5 animate-pulse" /> : <Cloud className="w-5 h-5" />}
                    {cloudSyncing ? 'Syncing...' : 'Sync to Cloud'}
                  </button>
                  <button
                    onClick={() => { onSignOut(); closeMobile(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" /> Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { onOpenAuth(); closeMobile(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[#6E6A60] hover:bg-[#E8E6DC] transition-colors"
                >
                  <User className="w-5 h-5" /> Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
