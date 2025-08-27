import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full border border-input bg-input px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:border-primary focus-visible:shadow-[0_0_0_1px_rgb(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground md:text-sm",
          className
        )}
        style={{ borderRadius: 0 }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
