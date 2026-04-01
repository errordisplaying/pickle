import { useState, useCallback, useRef } from 'react';
import { X, ShoppingCart, Check, Lightbulb, ExternalLink, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ShoppingItem, IngredientCategory } from '@/types';
import { STORAGE_KEYS } from '@/constants';
import { cookingTips } from '@/data';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { CHECKOUT_PROVIDERS, buildSingleItemUrl, getUnpurchasedCount } from '@/utils/checkout';
import { formatQuantity, parseIngredientLine } from '@/utils';
import { categorizeIngredient } from '@/constants';
import { trackEvent, EVENTS } from '@/utils/analytics';

interface ShoppingListOverlayProps {
  shoppingList: ShoppingItem[];
  onToggleItem: (id: string) => void;
  onGenerateFromPlan: () => void;
  onClearPurchased: () => void;
  onClearAll: () => void;
  onOpenPlanner: () => void;
  onClose: () => void;
  onAddItem?: (item: ShoppingItem) => void;
  onEditItem?: (id: string, updates: Partial<ShoppingItem>) => void;
}

export default function ShoppingListOverlay({
  shoppingList,
  onToggleItem,
  onGenerateFromPlan,
  onClearPurchased,
  onClearAll,
  onOpenPlanner,
  onClose,
  onAddItem,
  onEditItem,
}: ShoppingListOverlayProps) {
  const [closing, setClosing] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);
  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 250);
  }, [onClose]);
  const unpurchasedCount = getUnpurchasedCount(shoppingList);

  const [tipIndex] = useState(() => {
    const stored = parseInt(localStorage.getItem(STORAGE_KEYS.TIP_INDEX) || '0', 10);
    const next = (stored + 1) % cookingTips.length;
    localStorage.setItem(STORAGE_KEYS.TIP_INDEX, String(next));
    return stored;
  });
  const currentTip = cookingTips[tipIndex];

  useBodyScrollLock();
  const trapRef = useFocusTrap(handleClose);
  return (
    <div ref={trapRef} role="dialog" aria-modal="true" aria-label="Shopping list" className={`fixed inset-0 bg-[#F4F2EA]/98 backdrop-blur-sm z-[203] flex flex-col overflow-y-auto ${closing ? 'animate-overlay-out' : 'animate-overlay-in'}`}>
      {/* Header */}
      <div className="px-5 sm:px-8 py-5 border-b border-black/5">
        {/* Top row: title + close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-[#C49A5C]" />
            <h2 className="text-xl sm:text-2xl font-black lowercase text-[#1A1A1A]">shopping list</h2>
            <span className="text-sm text-[#6E6A60] hidden sm:inline">
              ({shoppingList.filter(i => !i.purchased).length} remaining)
            </span>
          </div>
          <Button onClick={handleClose} variant="outline" className="rounded-full h-10 w-10 p-0 flex items-center justify-center flex-shrink-0" aria-label="Close shopping list">
            <X className="w-5 h-5" />
          </Button>
        </div>
        {/* Action buttons row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
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
          {unpurchasedCount > 0 && (
            <div className="relative ml-auto sm:ml-0">
              <Button
                onClick={() => setShowCheckout(!showCheckout)}
                className="bg-[#1A1A1A] text-white hover:bg-[#333] rounded-full text-xs gap-1"
                size="sm"
              >
                <ExternalLink className="w-3 h-3" /> Order Groceries
              </Button>
              {showCheckout && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-[#E8E6DC] overflow-hidden z-50 w-56">
                  <div className="p-2">
                    <p className="text-[10px] text-[#6E6A60] px-3 py-1.5">Send {unpurchasedCount} items to:</p>
                    {CHECKOUT_PROVIDERS.map(provider => (
                      <button
                        key={provider.id}
                        onClick={() => {
                          const url = provider.buildCartUrl(shoppingList);
                          window.open(url, '_blank', 'noopener');
                          trackEvent(EVENTS.RECIPE_SEARCH, { checkoutProvider: provider.id, itemCount: unpurchasedCount });
                          setShowCheckout(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#1A1A1A] hover:bg-[#F4F2EA] transition-colors text-left"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: provider.color }} />
                        {provider.name}
                        <ExternalLink className="w-3 h-3 text-[#6E6A60] ml-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <span className="text-xs text-[#6E6A60] sm:hidden ml-auto">
            {shoppingList.filter(i => !i.purchased).length} remaining
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 sm:px-8 py-6">
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
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2 font-handwritten">your list is empty</h3>
              <p className="text-[#6E6A60] text-sm leading-relaxed mb-6">Add meals to your planner first, then we'll generate a smart shopping list grouped by aisle.</p>
              <Button onClick={onOpenPlanner} className="bg-[#C49A5C] text-white hover:bg-[#8B6F3C] rounded-full btn-press">
                Open Planner
              </Button>

              {/* Rotating cooking tip */}
              <div className="mt-8 bg-[#F4F2EA] rounded-2xl p-4 max-w-sm mx-auto border border-[#E8E6DC]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#C49A5C]/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lightbulb className="w-4 h-4 text-[#C49A5C]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1A1A1A] mb-0.5">{currentTip.title}</p>
                    <p className="text-xs text-[#6E6A60] leading-relaxed">{currentTip.description}</p>
                  </div>
                </div>
              </div>
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
                    className="h-full bg-[#8B9E6B] rounded-full transition-all duration-300"
                    style={{ width: `${(shoppingList.filter(i => i.purchased).length / shoppingList.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Add custom item */}
              {onAddItem && (
                <div className="mb-6 flex items-center gap-2">
                  <input
                    ref={addInputRef}
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newItemText.trim()) {
                        const parsed = parseIngredientLine(newItemText);
                        onAddItem({
                          id: `shop-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                          name: parsed.name,
                          category: categorizeIngredient(parsed.name),
                          purchased: false,
                          fromRecipes: ['Custom'],
                          quantity: parsed.quantity,
                          unit: parsed.unit,
                          rawLine: newItemText.trim(),
                        });
                        setNewItemText('');
                      }
                    }}
                    placeholder="Add item (e.g. 2 cups flour)"
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-[#E8E6DC] bg-white text-sm text-[#1A1A1A] placeholder:text-[#6E6A60]/50 focus:outline-none focus:ring-2 focus:ring-[#C49A5C]/30"
                  />
                  <button
                    onClick={() => {
                      if (!newItemText.trim()) { addInputRef.current?.focus(); return; }
                      const parsed = parseIngredientLine(newItemText);
                      onAddItem({
                        id: `shop-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        name: parsed.name,
                        category: categorizeIngredient(parsed.name),
                        purchased: false,
                        fromRecipes: ['Custom'],
                        quantity: parsed.quantity,
                        unit: parsed.unit,
                        rawLine: newItemText.trim(),
                      });
                      setNewItemText('');
                    }}
                    className="p-2.5 rounded-2xl bg-[#C49A5C] text-white hover:bg-[#8B6F3C] transition-colors flex-shrink-0"
                    aria-label="Add item"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}

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
                        editingId === item.id && onEditItem ? (
                          <div key={item.id} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#C49A5C]/30">
                            <input
                              autoFocus
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editText.trim()) {
                                  const parsed = parseIngredientLine(editText);
                                  onEditItem(item.id, { name: parsed.name, quantity: parsed.quantity, unit: parsed.unit, rawLine: editText.trim() });
                                  setEditingId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                }
                              }}
                              onBlur={() => {
                                if (editText.trim()) {
                                  const parsed = parseIngredientLine(editText);
                                  onEditItem(item.id, { name: parsed.name, quantity: parsed.quantity, unit: parsed.unit, rawLine: editText.trim() });
                                }
                                setEditingId(null);
                              }}
                              className="flex-1 text-sm text-[#1A1A1A] bg-transparent focus:outline-none"
                            />
                            <span className="text-[10px] text-[#6E6A60]">Enter to save</span>
                          </div>
                        ) : (
                          <button
                            key={item.id}
                            onClick={() => onToggleItem(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                              item.purchased ? 'bg-[#E8E6DC]/50 opacity-60' : 'bg-white hover:bg-[#F4F2EA]'
                            } border border-black/5`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              item.purchased ? 'bg-[#8B9E6B] border-[#8B9E6B]' : 'border-[#C49A5C]/30'
                            }`}>
                              {item.purchased && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm font-medium flex-1 text-left ${item.purchased ? 'line-through text-[#6E6A60]' : 'text-[#1A1A1A]'}`}>
                              {item.quantity != null && (
                                <span className="font-bold text-[#C49A5C] mr-1">
                                  {formatQuantity(item.quantity)}{item.unit ? ` ${item.unit}` : ''}
                                </span>
                              )}
                              {item.name}
                            </span>
                            <span className="text-[10px] text-[#6E6A60]">
                              {item.fromRecipes.length} recipe{item.fromRecipes.length > 1 ? 's' : ''}
                            </span>
                            {!item.purchased && onEditItem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditText(item.rawLine || `${item.quantity != null ? formatQuantity(item.quantity) : ''}${item.unit ? ` ${item.unit}` : ''} ${item.name}`.trim());
                                  setEditingId(item.id);
                                }}
                                className="p-1 rounded-full hover:bg-[#C49A5C]/10 text-[#6E6A60] hover:text-[#C49A5C] transition-colors flex-shrink-0"
                                aria-label={`Edit ${item.name}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            {!item.purchased && (
                              <a
                                href={buildSingleItemUrl(item)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-full hover:bg-[#C49A5C]/10 text-[#6E6A60] hover:text-[#C49A5C] transition-colors flex-shrink-0"
                                aria-label={`Find ${item.name} on Instacart`}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </button>
                        )
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
