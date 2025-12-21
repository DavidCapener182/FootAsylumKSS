import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-gray-900 shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 shadow-sm",
        secondary:
          "bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 shadow-sm",
        ghost: "hover:bg-gray-100 text-gray-700",
        link: "text-gray-900 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 min-h-[44px] md:min-h-[40px] px-6 py-2",
        sm: "h-9 min-h-[44px] md:min-h-[36px] px-4",
        lg: "h-11 min-h-[44px] md:min-h-[44px] px-8",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

