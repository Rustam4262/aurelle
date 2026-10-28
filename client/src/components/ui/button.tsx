import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.005em] transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-300 ease-out-expo active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
    " hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        // Brand pill with a soft vertical gradient, inner highlight and colored glow
        default:
          "bg-primary bg-[linear-gradient(180deg,rgb(255_255_255/0.16),rgb(0_0_0/0.14))] text-primary-foreground border border-white/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_24px_-8px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_14px_34px_-10px_hsl(var(--primary)/0.75)]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive-border shadow-md shadow-destructive/25",
        outline:
          "border border-foreground/12 bg-card/60 backdrop-blur hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
        secondary:
          "border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "border border-transparent hover:bg-foreground/5",
      },
      size: {
        default: "min-h-10 px-5 py-2",
        sm: "min-h-8 px-3.5 text-xs",
        lg: "min-h-12 px-8 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
