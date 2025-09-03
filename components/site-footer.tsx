"use client"

interface SiteFooterProps {
  className?: string
  variant?: "compact" | "spacious"
}

export function SiteFooter({ className = "", variant = "compact" }: SiteFooterProps) {
  if (variant === "spacious") {
    // Homepage version with py-16 spacing
    return (
      <footer className={`bg-neutral-50/80 border-t border-neutral-200/50 mt-auto ${className}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
            {/* Left */}
            <div className="order-2 sm:order-1 justify-self-center sm:justify-self-start text-sm text-neutral-500">
              © 2025 cinamini. Made with 🍿 in Grand Rapids, MI
            </div>

            {/* Center social */}
            <div className="order-1 sm:order-2 justify-self-center">
              <div className="flex items-center gap-5">
                <a href="https://www.instagram.com/cinamini.app" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-900 transition-colors" aria-label="Instagram">
                  <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 16V8C3 5.23858 5.23858 3 8 3H16C18.7614 3 21 5.23858 21 8V16C21 18.7614 18.7614 21 16 21H8C5.23858 21 3 18.7614 3 16Z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M17.5 6.51L17.51 6.49889" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a href="http://threads.com/@cinamini.app" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-900 transition-colors" aria-label="Threads">
                  <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.9141 8.12803C12.4185 6.11437 16.0241 7.18759 16.45 10.5C16.9018 14.014 16 16.8 12.5 16.8C9.24997 16.8 9.34997 14 9.34997 14C9.34997 11 14.5 10.6 17.5 12.1C23 15.6 19 22 13 22C8.02941 22 3.99997 19.5 3.99997 12C3.99997 4.5 8.02941 2 13 2C16.5079 2 19.6715 3.80695 20.8348 7.42085" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a href="https://discord.gg/vjpzKNcfU3" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-900 transition-colors" aria-label="Discord">
                  <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.5 16C10.5 18.5 13.5 18.5 18.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15.5 17.5L16.5 19.5C16.5 19.5 20.6713 18.1717 22 16C22 15 22.5301 7.85339 19 5.5C17.5 4.5 15 4 15 4L14 6H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8.52832 17.5L7.52832 19.5C7.52832 19.5 3.35699 18.1717 2.02832 16C2.02832 15 1.49823 7.85339 5.02832 5.5C6.52832 4.5 9.02832 4 9.02832 4L10.0283 6H12.0283" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8.5 14C7.67157 14 7 13.1046 7 12C7 10.8954 7.67157 10 8.5 10C9.32843 10 10 10.8954 10 12C10 13.1046 9.32843 14 8.5 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15.5 14C14.6716 14 14 13.1046 14 12C14 10.8954 14.6716 10 15.5 10C16.3284 10 17 10.8954 17 12C17 13.1046 16.3284 14 15.5 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a href="https://x.com/cinamini_app" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-900 transition-colors" aria-label="X (Twitter)">
                  <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.8198 20.7684L3.75317 3.96836C3.44664 3.57425 3.72749 3 4.22678 3H6.70655C6.8917 3 7.06649 3.08548 7.18016 3.23164L20.2468 20.0316C20.5534 20.4258 20.2725 21 19.7732 21H17.2935C17.1083 21 16.9335 20.9145 16.8198 20.7684Z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M20 3L4 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right */}
            <div className="order-3 sm:order-3 justify-self-center sm:justify-self-end flex items-center space-x-8 text-sm">
              <a href="/profile" className="text-neutral-500 hover:text-neutral-900 transition-colors font-funnel font-medium">
                Profile
              </a>
              <a href="/stats" className="text-neutral-500 hover:text-neutral-900 transition-colors font-funnel font-medium">
                Statistics
              </a>
              <a href="/privacy" className="text-neutral-500 hover:text-neutral-900 transition-colors font-funnel font-medium">
                Privacy
              </a>
              <a href="/terms" className="text-neutral-500 hover:text-neutral-900 transition-colors font-funnel font-medium">
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
    <footer className={`bg-neutral-50/80 border-t border-neutral-200/50 mt-auto py-4 sm:h-16 sm:py-0 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 items-center h-full gap-2">
          {/* Left */}
          <div className="order-2 sm:order-1 justify-self-center sm:justify-self-start text-sm text-neutral-500">
            © 2025 cinamini. Made with 🍿 in Grand Rapids, MI
          </div>

          {/* Center social */}
          <div className="order-1 sm:order-2 justify-self-center">
            <div className="flex items-center gap-5">
              <a href="https://www.instagram.com/cinamini.app" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-900 transition-colors" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 16V8C3 5.23858 5.23858 3 8 3H16C18.7614 3 21 5.23858 21 8V16C21 18.7614 18.7614 21 16 21H8C5.23858 21 3 18.7614 3 16Z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M17.5 6.51L17.51 6.49889" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="http://threads.com/@cinamini.app" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-900 transition-colors" aria-label="Threads">
                <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.9141 8.12803C12.4185 6.11437 16.0241 7.18759 16.45 10.5C16.9018 14.014 16 16.8 12.5 16.8C9.24997 16.8 9.34997 14 9.34997 14C9.34997 11 14.5 10.6 17.5 12.1C23 15.6 19 22 13 22C8.02941 22 3.99997 19.5 3.99997 12C3.99997 4.5 8.02941 2 13 2C16.5079 2 19.6715 3.80695 20.8348 7.42085" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="https://discord.gg/vjpzKNcfU3" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-900 transition-colors" aria-label="Discord">
                <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.5 16C10.5 18.5 13.5 18.5 18.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15.5 17.5L16.5 19.5C16.5 19.5 20.6713 18.1717 22 16C22 15 22.5301 7.85339 19 5.5C17.5 4.5 15 4 15 4L14 6H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8.52832 17.5L7.52832 19.5C7.52832 19.5 3.35699 18.1717 2.02832 16C2.02832 15 1.49823 7.85339 5.02832 5.5C6.52832 4.5 9.02832 4 9.02832 4L10.0283 6H12.0283" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8.5 14C7.67157 14 7 13.1046 7 12C7 10.8954 7.67157 10 8.5 10C9.32843 10 10 10.8954 10 12C10 13.1046 9.32843 14 8.5 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15.5 14C14.6716 14 14 13.1046 14 12C14 10.8954 14.6716 10 15.5 10C16.3284 10 17 10.8954 17 12C17 13.1046 16.3284 14 15.5 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="https://x.com/cinamini_app" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-900 transition-colors" aria-label="X (Twitter)">
                <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.8198 20.7684L3.75317 3.96836C3.44664 3.57425 3.72749 3 4.22678 3H6.70655C6.8917 3 7.06649 3.08548 7.18016 3.23164L20.2468 20.0316C20.5534 20.4258 20.2725 21 19.7732 21H17.2935C17.1083 21 16.9335 20.9145 16.8198 20.7684Z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M20 3L4 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right */}
          <div className="order-3 sm:order-3 justify-self-center sm:justify-self-end flex items-center space-x-8 text-sm">
            <a href="/profile" className="text-neutral-500 hover:text-neutral-900 transition-colors font-funnel font-medium">
              Profile
            </a>
            <a href="/stats" className="text-neutral-500 hover:text-neutral-900 transition-colors font-funnel font-medium">
              Statistics
            </a>
            <a href="/privacy" className="text-neutral-500 hover:text-neutral-900 transition-colors font-funnel font-medium">
              Privacy
            </a>
            <a href="/terms" className="text-neutral-500 hover:text-neutral-900 transition-colors font-funnel font-medium">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}