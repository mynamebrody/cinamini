import { SiteFooter } from "@/components/site-footer"

export default function Terms() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <a href="/" className="inline-block">
            <img 
              src="/cinamini/Wordmark - Black.svg" 
              alt="cinamini" 
              className="h-8 w-auto"
            />
          </a>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <h1 className="text-3xl font-bold text-neutral-900 font-funnel-display-bold mb-8">
          Terms of Service
        </h1>
        
        <div className="prose prose-neutral max-w-none">
          <p className="text-sm text-neutral-500 mb-8">
            Last updated: August 17, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Acceptance of Terms
            </h2>
            <p className="text-neutral-700">
              By accessing or using cinamini, you agree to be bound by these Terms of Service 
              and our Privacy Policy. If you do not agree, please do not use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Description of Service
            </h2>
            <p className="text-neutral-700 mb-4">
              cinamini is a daily movie puzzle platform featuring multiple games for movie enthusiasts, including:
            </p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li><strong>Retitled:</strong> Guess movies from their localized titles</li>
              <li><strong>Budget Bracket:</strong> Progressive movie budget elimination game</li>
              <li><strong>Cast Climb:</strong> Guess movies from progressive cast reveals</li>
              <li><strong>Poster Pixels:</strong> Guess movies from pixelated poster images</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              User Accounts
            </h2>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li>You must provide accurate information when creating an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must be at least 13 years old to create an account</li>
              <li>One account per person</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Acceptable Use
            </h2>
            <p className="text-neutral-700 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-neutral-700 space-y-2">
              <li>Use automated tools or bots to play games</li>
              <li>Share solutions or answers to daily puzzles</li>
              <li>Attempt to manipulate scores or statistics</li>
              <li>Reverse engineer or exploit our systems</li>
              <li>Use the service for any illegal or unauthorized purpose</li>
              <li>Interfere with other users' enjoyment of the games</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Content and Intellectual Property
            </h2>
            <p className="text-neutral-700 mb-4">
              cinamini and its original content, features, and functionality are owned by cinamini and are protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-neutral-700 mb-4">
              Movie data, including titles, posters, cast information, and other metadata, is provided by third-party sources and remains the property of their respective owners.
            </p>
            <p className="text-neutral-700">
              You retain ownership of any content you create (like display names), but grant us permission to use it as part of the service.
            </p>
          </section>

          {/* TMDB Attribution Section */}
          <section className="mb-8 p-6 bg-neutral-50 rounded-lg border border-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-6">
              Movie Database Attribution
            </h2>
            
            <div className="flex items-start gap-6 mb-6">
              <img 
                src="/tmdb-logo.svg" 
                alt="The Movie Database (TMDB)" 
                className="h-12 w-auto flex-shrink-0"
              />
              <div>
                <p className="text-neutral-700 mb-4 font-medium">
                  This product uses the TMDB API but is not endorsed or certified by TMDB.
                </p>
                <p className="text-neutral-700 mb-4">
                  Movie information, including titles, posters, cast details, budgets, and other metadata displayed on cinamini is provided by{" "}
                  <a 
                    href="https://www.themoviedb.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cinema-red hover:text-cinema-red-dark underline font-medium"
                  >
                    The Movie Database (TMDB)
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="text-sm text-neutral-600 space-y-2">
              <p>
                <strong>Data Usage:</strong> We use TMDB's API to retrieve movie information for our puzzle games, including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Movie titles and translations</li>
                <li>Cast and crew information</li>
                <li>Movie posters and images</li>
                <li>Release dates and production details</li>
                <li>Budget and box office information</li>
              </ul>
              <p className="mt-3">
                <strong>Disclaimer:</strong> cinamini is an independent project and is not affiliated with, endorsed, sponsored, or specifically approved by The Movie Database (TMDB).
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Service Availability
            </h2>
            <p className="text-neutral-700">
              We strive to keep cinamini available 24/7, but cannot guarantee uninterrupted access. 
              We may modify or discontinue features at any time with reasonable notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Limitation of Liability
            </h2>
            <p className="text-neutral-700">
              cinamini is provided "as is" without warranties. We are not liable for any damages 
              arising from your use of the service, including lost data or interruption of service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Privacy
            </h2>
            <p className="text-neutral-700">
              Your privacy is important to us. Please review our{' '}
              <a href="/privacy" className="text-cinema-red hover:underline">Privacy Policy</a>{' '}
              to understand how we collect and use your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Changes to Terms
            </h2>
            <p className="text-neutral-700">
              We may update these terms periodically. Continued use of cinamini after changes 
              indicates acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Termination
            </h2>
            <p className="text-neutral-700">
              We may suspend or terminate accounts that violate these terms. You may delete 
              your account at any time by reaching out to support.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 font-funnel-display-bold mb-4">
              Contact Us
            </h2>
            <p className="text-neutral-700">
              Questions about these Terms of Service? Contact us at{' '}
              <a href="mailto:support@cinamini.app" className="text-cinema-red hover:underline">
                support@cinamini.app
              </a>
            </p>
          </section>

        </div>
      </main>

      <SiteFooter />
    </div>
  )
}