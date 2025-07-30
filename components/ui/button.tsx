import * as React from "react"

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

const getVariantClasses = (variant: ButtonVariant) => {
  switch (variant) {
    case 'primary':
      return 'btn-primary'
    case 'secondary':
      return 'btn-secondary'
    case 'ghost':
      return 'btn-ghost'
    case 'outline':
      return 'btn-outline'
    case 'destructive':
      return 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600'
    default:
      return 'btn-primary'
  }
}

const getSizeClasses = (size: ButtonSize) => {
  switch (size) {
    case 'sm':
      return 'btn-sm'
    case 'lg':
      return 'btn-lg'
    case 'md':
    default:
      return 'btn-md'
  }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', asChild = false, children, ...props }, ref) => {
    const baseClasses = 'btn'
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

export { Button }