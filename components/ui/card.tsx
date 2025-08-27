import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const cardVariants = cva(
  "bg-card text-card-foreground border border-border transition-all duration-200",
  {
    variants: {
      variant: {
        default: "shadow-[1px_1px_0px_rgb(var(--border)),2px_2px_0px_rgb(var(--border)),3px_3px_0px_rgb(var(--border)),4px_4px_0px_rgb(var(--border))]",
        interactive: "shadow-[1px_1px_0px_rgb(var(--border)),2px_2px_0px_rgb(var(--border)),3px_3px_0px_rgb(var(--border)),4px_4px_0px_rgb(var(--border))] hover:shadow-[1px_1px_0px_rgb(var(--primary)),2px_2px_0px_rgb(var(--primary)),3px_3px_0px_rgb(var(--primary)),4px_4px_0px_rgb(var(--primary))] hover:border-primary hover:-translate-y-0.5 cursor-pointer",
        featured: "shadow-[2px_2px_0px_rgb(var(--border)),4px_4px_0px_rgb(var(--border)),6px_6px_0px_rgb(var(--border))] hover:shadow-[2px_2px_0px_rgb(var(--primary)),4px_4px_0px_rgb(var(--primary)),6px_6px_0px_rgb(var(--primary)),8px_8px_0px_rgb(var(--primary))] hover:border-primary hover:-translate-y-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      style={{ borderRadius: 0 }}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }