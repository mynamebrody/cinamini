"use client"

import { Button } from "@/components/ui/button"
import { Loader2, User, Chrome, Mail } from "lucide-react"
import { cn } from "@/lib/utils"

type AuthProvider = 'google' | 'apple' | 'email'

interface SocialAuthButtonProps {
  provider: AuthProvider
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
}

const providerConfig = {
  google: {
    name: 'Google',
    icon: Chrome,
    bgColor: 'bg-white',
    textColor: 'text-neutral-900',
    borderColor: 'border-[#d1d2d4]',
    hoverBg: 'hover:text-[rgb(153,37,29)] hover:border-[rgb(153,37,29)]',
    shadowClass: '', // No default shadow
    hoverShadow: 'hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]'
  },
  apple: {
    name: 'Apple',
    icon: User,
    bgColor: 'bg-white',
    textColor: 'text-neutral-900',
    borderColor: 'border-[#d1d2d4]',
    hoverBg: 'hover:text-[rgb(153,37,29)] hover:border-[rgb(153,37,29)]',
    shadowClass: '', // No default shadow
    hoverShadow: 'hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]'
  },
  email: {
    name: 'Email',
    icon: Mail,
    bgColor: 'bg-white',
    textColor: 'text-neutral-900',
    borderColor: 'border-[#d1d2d4]',
    hoverBg: 'hover:text-[rgb(153,37,29)] hover:border-[rgb(153,37,29)]',
    shadowClass: '', // No default shadow
    hoverShadow: 'hover:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29),3px_3px_0px_rgb(153,37,29),4px_4px_0px_rgb(153,37,29)]'
  }
} as const

export default function SocialAuthButton({ 
  provider, 
  onClick, 
  loading = false, 
  disabled = false,
  className 
}: SocialAuthButtonProps) {
  const config = providerConfig[provider]
  const IconComponent = config.icon

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "w-full h-12 font-medium transition-all duration-200 relative border",
        config.bgColor,
        config.textColor,
        config.borderColor,
        config.hoverBg,
        // Hover shadow effect (cinema red 3D shadow)
        config.hoverShadow,
        // Hover transform
        "hover:transform hover:-translate-y-0.5",
        // Active/pressed state
        "active:transform active:translate-x-0.5 active:translate-y-0.5",
        "active:shadow-[1px_1px_0px_rgb(153,37,29),2px_2px_0px_rgb(153,37,29)]",
        // Disabled state
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
        className
      )}
      variant="ghost" // Use ghost to avoid default button styling
    >
      {loading ? (
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
      ) : (
        <IconComponent className="mr-3 h-5 w-5" />
      )}
      {loading ? (
        `Connecting to ${config.name}...`
      ) : (
        `Continue with ${config.name}`
      )}
    </Button>
  )
}