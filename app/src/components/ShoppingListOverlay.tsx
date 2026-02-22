import { X, ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ShoppingItem, IngredientCategory } from '@/types';

interface ShoppingListOverlayProps {
  shoppingList: ShoppingItem[];
  onToggleItem: (id: string) => void;
  onGenerateFromPlan: () => void;
  onClearPurchased: () => void;
  onClearAll: () => void;
  onOpenPlanner: () => void;
  onClose: () => void;
}

export default function ShoppingListOverlay({
  shoppingList,
  onToggleItem,
  onGenerateFromPlan,
  onClearPurchased,
  onClearAll,
  onOpenPlanner,
  onClose,
}: ShoppingListOverlayProps) {
  return (
    <div className="fixed inset-0 bg-[#F4F2EA]/98 backdrop-blur-sm z-[203] flex flex-col overflow-y-auto animate-overlay-in">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-black/5">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-[#C49A5C]" />
          <h2 className="text-2xl font-black uppercase text-[#1A1A1A]">Shopping List</h2>
          <span className="text-sm text-[#6E6A60]">
            ({shoppingList.filter(i => !i.purchased).length} remaining)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onGenerateFromPlan} className="bg-[#C49A5C] text-white hover:bg-[#8B6F3C] rounded-full text-xs" size="sm">
            Generate from Plan
          </Button>
          {shoppingList.some(i => i.purchased) && (
            <Button onClick={onClearPurchased} variant="outline" className="rounded-full text-xs" size="sm">
              Clear Purchased
            </Button>
          )}
          {shoppingList.length > 0 && (
            <Button onClick={onClearAll} variant="outline" className="rounded-full text-xs text-red-500" size="sm">
              Clear All
            </Button>
          )}
          <Button onClick={onClose} variant="outline" className="rounded-full h-10 w-10 p-0 flex items-center justify-center">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        <div className="max-w-3xl mx-auto">
          {shoppingList.length === 0 ? (
            <div className="text-center py-20 max-w-md mx-auto">
              {/* Inline illustration — shopping bag */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  {/* Bag body */}
                  <rect x="28" y="50" width="72" height="56" rx="8" fill="#F4F2EA" stroke="#E8E6DC" strokeWidth="2" />
                  {/* Bag handles */}
                  <path d="M44 50 C44 36, 52 28, 64 28 C76 28, 84 36, 84 50" stroke="#C49A5C" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
                  {/* Vegetables peeking out */}
                  <ellipse cx="48" cy="50" rx="6" ry="10" fill="#8B9E6B" opacity="0.5" />
                  <ellipse cx="64" cy="48" rx="5" ry="12" fill="#C49A5C" opacity="0.4" />
                  <ellipse cx="78" cy="50" rx="6" ry="9" fill="#A8B590" opacity="0.5" />
                  {/* Checkmark on bag */}
                  <circle cx="64" cy="78" r="12" fill="#C49A5C" opacity="0.15" />
                  <path d="M58 78 L62 82 L70 74" stroke="#C49A5C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">your list is empty</h3>
              <p className="text-[#6E6A60] text-sm leading-relaxed mb-6">Add meals to your planner first, then we'll generate a smart shopping list grouped by aisle.</p>
              <Button onClick={onOpenPlanner} className="bg-[#C49A5C] text-white hover:bg-[#8B6F3C] rounded-full btn-press">
                Open Meal Planner
              </Button>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-[#6E6A60] mb-1.5">
                  <span>{shoppingList.filter(i => i.purchased).length} of {shoppingList.length} items</span>
                  <span>{Math.round((shoppingList.filter(i => i.purchased).length / shoppingList.length) * 100)}% complete</span>
                </div>
                <div className="h-2 bg-[#E8E6DC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${(shoppingList.filter(i => i.purchased).length / shoppingList.length) * 100}%` }}
                  />
                </div>
              </div>

              {(['Produce', 'Protein', 'Dairy', 'Pantry', 'Spices', 'Other'] as IngredientCategory[]).map(category => {
                const items = shoppingList.filter(i => i.category === category);
                if (items.length === 0) return null;
                return (
                  <div key={category} className="mb-6">
                    <h3 className="text-xs font-bold text-[#C49A5C] uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span>{category === 'Produce' ? '🥬' : category === 'Protein' ? '🥩' : category === 'Dairy' ? '🥛' : category === 'Pantry' ? '🫙' : category === 'Spices' ? '🌿' : '📦'}</span>
                      {category}
                      <span className="text-[#6E6A60] font-normal">({items.filter(i => !i.purchased).length})</span>
                    </h3>
                    <div className="space-y-1.5">
                      {items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => onToggleItem(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                            item.purchased ? 'bg-[#E8E6DC]/50 opacity-60' : 'bg-white hover:bg-[#F4F2EA]'
                          } border border-black/5`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            item.purchased ? 'bg-emerald-500 border-emerald-500' : 'border-[#C49A5C]/30'
                          }`}>
                            {item.purchased && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-sm font-medium flex-1 text-left ${item.purchased ? 'line-through text-[#6E6A60]' : 'text-[#1A1A1A]'}`}>
                            {item.name}
                          </span>
                          <span className="text-[10px] text-[#6E6A60]">
                            {item.fromRecipes.length} recipe{item.fromRecipes.length > 1 ? 's' : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
