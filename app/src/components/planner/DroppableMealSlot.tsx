import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

interface DroppableMealSlotProps {
  day: string;
  slot: 'breakfast' | 'lunch' | 'dinner';
  children: ReactNode;
}

export default function DroppableMealSlot({ day, slot, children }: DroppableMealSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${day}-${slot}`,
    data: { day, slot },
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all duration-200 rounded-[24px] ${
        isOver ? 'scale-[1.02] ring-2 ring-[#C49A5C] ring-offset-2' : ''
      }`}
    >
      {children}
    </div>
  );
}
