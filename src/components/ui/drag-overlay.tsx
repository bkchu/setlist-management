import React from 'react';
import { DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { DropAnimation } from '@dnd-kit/core';

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

interface DragPreviewProps {
  children: React.ReactNode;
}

export function DragPreview({ children }: DragPreviewProps) {
  if (!children) return null;

  return (
    <DragOverlay dropAnimation={dropAnimationConfig}>
      <div className="drag-preview-container">
        {children}
      </div>
    </DragOverlay>
  );
}

// CSS styles for drag preview
export const dragPreviewStyles = `
  .drag-preview-container {
    opacity: 0.8;
    transform: rotate(5deg);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
    border: 2px solid hsl(var(--primary));
    border-radius: 8px;
    background: hsl(var(--background));
    backdrop-filter: blur(4px);
    z-index: 1000;
  }

  .drag-preview-container * {
    pointer-events: none;
  }

  .sortable-item {
    transition: transform 200ms ease, opacity 200ms ease;
  }

  .sortable-item.is-dragging {
    opacity: 0.4;
    transform: scale(0.95);
  }

  .sortable-item.is-over {
    transform: scale(1.02);
  }
`;