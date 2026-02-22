import { X } from 'lucide-react';
import type { Toast } from '@/types';

interface ToastNotificationsProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastNotifications({ toasts, onDismiss }: ToastNotificationsProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto px-5 py-3 rounded-2xl shadow-lg backdrop-blur-md text-sm font-medium flex items-center gap-2 animate-toast-in ${
            toast.type === 'success' ? 'bg-emerald-500/90 text-white' :
            toast.type === 'info' ? 'bg-[#C49A5C]/90 text-white' :
            toast.type === 'warning' ? 'bg-amber-500/90 text-white' :
            'bg-red-500/90 text-white'
          }`}
        >
          <span>{toast.type === 'success' ? '✓' : toast.type === 'info' ? 'ℹ' : toast.type === 'warning' ? '⚠' : '✕'}</span>
          {toast.message}
          <button
            onClick={() => onDismiss(toast.id)}
            className="ml-1 opacity-70 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
