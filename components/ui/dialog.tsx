"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Custom lightweight Dialog primitive.
 *
 * Structure uses React context so that:
 *   - `<Dialog open onOpenChange>` renders its children UNCONDITIONALLY
 *     (so triggers are always visible)
 *   - `<DialogTrigger>` reads the context and calls `onOpenChange(true)`
 *     when clicked; supports `asChild` to decorate an existing element
 *   - `<DialogContent>` only renders the modal overlay when `open === true`
 *
 * This is a drop-in replacement for the previous implementation, which had a
 * bug where `Dialog` returned `null` when closed — hiding the trigger itself
 * and making the dialog impossible to open from inside the same component.
 */

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

interface DialogTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue>({
  open: false,
  setOpen: () => {},
})

const Dialog = ({ open = false, onOpenChange, children }: DialogProps) => {
  const setOpen = React.useCallback(
    (next: boolean) => {
      onOpenChange?.(next)
    },
    [onOpenChange],
  )

  React.useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }
    return undefined
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, setOpen])

  const value = React.useMemo<DialogContextValue>(
    () => ({ open, setOpen }),
    [open, setOpen],
  )

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ asChild, onClick, children, className, ...props }, ref) => {
    const { setOpen } = React.useContext(DialogContext)

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      onClick?.(e)
      if (!e.defaultPrevented) setOpen(true)
    }

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        onClick?: (e: React.MouseEvent) => void
        className?: string
      }>
      return React.cloneElement(child, {
        ...props,
        onClick: (e: React.MouseEvent) => {
          child.props.onClick?.(e)
          if (!e.defaultPrevented) setOpen(true)
        },
        className: cn(child.props.className, className),
      } as Partial<typeof child.props>)
    }

    return (
      <button
        ref={ref}
        type="button"
        className={className}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  },
)
DialogTrigger.displayName = "DialogTrigger"

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DialogContext)
    if (!open) return null

    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        setOpen(false)
      }
    }

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn(
            "bg-white border border-[#3a3a3c] shadow-[2px_2px_0px_rgb(58,58,60),4px_4px_0px_rgb(58,58,60),6px_6px_0px_rgb(58,58,60),8px_8px_0px_rgb(58,58,60)] p-6 w-full max-w-lg mx-4 relative z-[9999]",
            className,
          )}
          style={{ borderRadius: 0 }}
          {...props}
        >
          {children}
        </div>
      </div>
    )
  },
)
DialogContent.displayName = "DialogContent"

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("mb-4", className)} {...props}>
        {children}
      </div>
    )
  },
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn("text-xl font-semibold text-neutral-900", className)}
        {...props}
      >
        {children}
      </h2>
    )
  },
)
DialogTitle.displayName = "DialogTitle"

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6",
        className,
      )}
      {...props}
    />
  )
})
DialogFooter.displayName = "DialogFooter"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  )
})
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
}
