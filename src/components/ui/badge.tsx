import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium tracking-tight transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0',
  {
    variants: {
      variant: {
        default:
          'border-primary/30 bg-primary/15 text-primary shadow-none hover:bg-primary/20',
        secondary:
          'border-white/10 bg-secondary/70 text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/20',
        outline:
          'border-white/20 bg-transparent text-muted-foreground hover:border-white/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
