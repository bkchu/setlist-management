import * as React from 'react';

import { cn } from '@/lib/utils';

// Using type instead of interface to avoid empty interface linting error
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm text-[#f8faf8] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#f8faf8] placeholder:text-muted-foreground hover:border-white/20 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 autofill:bg-card autofill:text-[#f8faf8] [&:-webkit-autofill]:bg-card [&:-webkit-autofill]:text-[#f8faf8] [&:-webkit-autofill]:[-webkit-text-fill-color:#f8faf8] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_var(--card)]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
