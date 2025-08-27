import * as React from "react"

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'icon'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

const getVariantClasses = (variant: ButtonVariant) => {
  switch (variant) {
    case 'primary':
      return 'bg-primary text-primary-foreground border border-primary hover:bg-background hover:text-primary hover:border-primary hover:shadow-[1px_1px_0px_rgb(var(--primary)),2px_2px_0px_rgb(var(--primary)),3px_3px_0px_rgb(var(--primary)),4px_4px_0px_rgb(var(--primary))] transition-all duration-150'
    case 'secondary':
      return 'bg-secondary text-secondary-foreground border border-border hover:bg-background hover:text-primary hover:border-primary hover:shadow-[1px_1px_0px_rgb(var(--primary)),2px_2px_0px_rgb(var(--primary)),3px_3px_0px_rgb(var(--primary)),4px_4px_0px_rgb(var(--primary))] transition-all duration-150'
    case 'ghost':
      return 'bg-transparent text-foreground border border-transparent hover:bg-transparent hover:text-primary hover:border-primary hover:shadow-[1px_1px_0px_rgb(var(--primary)),2px_2px_0px_rgb(var(--primary)),3px_3px_0px_rgb(var(--primary)),4px_4px_0px_rgb(var(--primary))] transition-all duration-150'
    case 'outline':
      return 'bg-transparent text-foreground border border-transparent hover:bg-transparent hover:text-primary hover:border-primary hover:shadow-[1px_1px_0px_rgb(var(--primary)),2px_2px_0px_rgb(var(--primary)),3px_3px_0px_rgb(var(--primary)),4px_4px_0px_rgb(var(--primary))] transition-all duration-150'
    case 'destructive':
      return 'bg-destructive text-destructive-foreground border border-destructive hover:bg-background hover:text-destructive hover:border-destructive hover:shadow-[1px_1px_0px_rgb(var(--destructive)),2px_2px_0px_rgb(var(--destructive)),3px_3px_0px_rgb(var(--destructive)),4px_4px_0px_rgb(var(--destructive))] transition-all duration-150'
    case 'icon':
      return 'bg-transparent text-foreground border border-transparent p-2 hover:bg-transparent hover:text-primary hover:border-primary hover:shadow-[1px_1px_0px_rgb(var(--primary)),2px_2px_0px_rgb(var(--primary)),3px_3px_0px_rgb(var(--primary)),4px_4px_0px_rgb(var(--primary))] transition-all duration-150'
    default:
      return 'bg-primary text-primary-foreground border border-primary hover:bg-background hover:text-primary hover:border-primary hover:shadow-[1px_1px_0px_rgb(var(--primary)),2px_2px_0px_rgb(var(--primary)),3px_3px_0px_rgb(var(--primary)),4px_4px_0px_rgb(var(--primary))] transition-all duration-150'
  }
}

const getSizeClasses = (size: ButtonSize) => {
  switch (size) {
    case 'sm':
      return 'h-9 px-3 text-xs'
    case 'lg':
      return 'h-11 px-8 text-base'
    case 'icon':
      return 'h-10 w-10 p-0'
    case 'md':
    default:
      return 'h-10 px-4 py-2 text-sm'
  }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', asChild = false, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
    const variantClasses = getVariantClasses(variant)
    const sizeClasses = getSizeClasses(size)
    const combinedClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`.trim()

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...children.props,
        className: `${children.props?.className || ''} ${combinedClasses}`.trim(),
        ref,
        ...props,
      })
    }

    return (
      <button
        className={combinedClasses}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"

// Export buttonVariants helper function for use in other components
export const buttonVariants = ({ variant = 'primary', size = 'md' }: { variant?: ButtonVariant; size?: ButtonSize } = {}) => {
  const baseClasses = 'btn'
  const variantClasses = getVariantClasses(variant)
  const sizeClasses = getSizeClasses(size)
  return `${baseClasses} ${variantClasses} ${sizeClasses}`.trim()
}

export { Button }