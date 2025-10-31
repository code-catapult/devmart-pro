import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@repo/shared/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 w-fit whitespace-nowrap",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow hover:bg-[var(--color-primary)]/80",
        secondary:
          "border-transparent bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-secondary)]/80",
        destructive:
          "border-transparent bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] shadow hover:bg-[var(--color-destructive)]/80",
        outline:
          "bg-[var(--color-muted-background)] text-[var(--color-primary-foreground)]",
        success:
          "border-transparent bg-green-500 text-white shadow hover:bg-green-500/80",
        warning:
          "border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-500/80",
      },
    },
    defaultVariants: {
      variant: "default",
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
