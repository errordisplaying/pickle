import type { ShoppingItem } from '@/types';
import { formatQuantity } from '@/utils';

export interface CheckoutProvider {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  buildCartUrl: (items: ShoppingItem[]) => string;
}

/** Get unpurchased items from a shopping list */
function getUnpurchasedItems(items: ShoppingItem[]): ShoppingItem[] {
  return items.filter(item => !item.purchased);
}

/** Format a shopping item with quantity for search: "2 cups flour" instead of just "flour" */
function formatItemForSearch(item: ShoppingItem): string {
  const parts: string[] = [];
  if (item.quantity != null) parts.push(formatQuantity(item.quantity));
  if (item.unit) parts.push(item.unit);
  parts.push(item.name);
  return parts.join(' ');
}

/** Encode item names (with quantities) into a search-friendly query string */
function encodeItemsForSearch(items: ShoppingItem[]): string {
  return items.map(formatItemForSearch).join(', ');
}

export const CHECKOUT_PROVIDERS: CheckoutProvider[] = [
  {
    id: 'instacart',
    name: 'Instacart',
    color: '#43B02A',
    bgColor: '#43B02A/10',
    buildCartUrl: (items) => {
      const unpurchased = getUnpurchasedItems(items);
      const query = encodeItemsForSearch(unpurchased);
      return `https://www.instacart.com/store/search/${encodeURIComponent(query)}`;
    },
  },
  {
    id: 'walmart',
    name: 'Walmart',
    color: '#0071CE',
    bgColor: '#0071CE/10',
    buildCartUrl: (items) => {
      const unpurchased = getUnpurchasedItems(items);
      const query = encodeItemsForSearch(unpurchased);
      return `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;
    },
  },
  {
    id: 'amazon-fresh',
    name: 'Amazon Fresh',
    color: '#FF9900',
    bgColor: '#FF9900/10',
    buildCartUrl: (items) => {
      const unpurchased = getUnpurchasedItems(items);
      const query = encodeItemsForSearch(unpurchased);
      return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&i=amazonfresh`;
    },
  },
];

/** Build a search URL for a single item on the given provider */
export function buildSingleItemUrl(item: ShoppingItem, providerId: string = 'instacart'): string {
  const provider = CHECKOUT_PROVIDERS.find(p => p.id === providerId);
  if (!provider) return '#';
  // Use the same logic but with a single-item array
  return provider.buildCartUrl([{ ...item, purchased: false }]);
}

/** Get the count of unpurchased items */
export function getUnpurchasedCount(items: ShoppingItem[]): number {
  return items.filter(item => !item.purchased).length;
}
