"use client"

interface SiteFooterProps {
  className?: string
  variant?: "compact" | "spacious"
}

export function SiteFooter({ className = "", variant = "compact" }: SiteFooterProps) {
  if (variant === "spacious") {
    // Homepage version with py-16 spacing
    return (
      <footer className={`bg-muted/80 border-t border-border/50 mt-auto ${className}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-sm text-muted-foreground mb-4 sm:mb-0">
              © 2025 cinamini. Made with 🍿 in Grand Rapids, MI
            </div>
            <div className="flex items-center space-x-8 text-sm">
              <a href="/profile" className="text-muted-foreground hover:text-foreground transition-colors font-funnel font-medium">
                Profile
              </a>
              <a href="/stats" className="text-muted-foreground hover:text-foreground transition-colors font-funnel font-medium">
                Statistics
              </a>
              <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors font-funnel font-medium">
                Privacy
              </a>
              <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors font-funnel font-medium">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  // Compact version (h-16) for other pages
  return (
    <footer className={`bg-muted/80 border-t border-border/50 mt-auto py-4 sm:h-16 sm:py-0 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex flex-col sm:flex-row justify-between items-center h-full">
          <div className="text-sm text-muted-foreground mb-2 sm:mb-0">
            © 2025 cinamini. Made with 🍿 in Grand Rapids, MI
          </div>
          <div className="flex items-center space-x-8 text-sm">
            <a href="/profile" className="text-muted-foreground hover:text-foreground transition-colors font-funnel font-medium">
              Profile
            </a>
            <a href="/stats" className="text-muted-foreground hover:text-foreground transition-colors font-funnel font-medium">
              Statistics
            </a>
            <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors font-funnel font-medium">
              Privacy
            </a>
            <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors font-funnel font-medium">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}