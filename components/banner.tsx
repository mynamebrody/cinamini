"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Calendar, Trophy } from "lucide-react"

export default function Banner() {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <section className="bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] py-12">
      <div className="max-w-7xl mx-auto px-4">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8 text-white">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                <span className="text-sm font-medium text-yellow-300 uppercase tracking-wide">
                  Daily Cinema Challenge
                </span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-3">
                Test Your Movie Knowledge
              </h2>
              <p className="text-lg text-white/90 mb-4 max-w-2xl">
                Challenge yourself with our collection of daily movie puzzles. From budget comparisons 
                to foreign title translations, discover how well you know cinema.
              </p>
              <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-white/80">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {today}
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  New puzzles daily
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                size="lg" 
                className="bg-white text-purple-700 hover:bg-white/90 font-semibold px-8"
                onClick={() => {
                  // Scroll to featured games section
                  const featuredSection = document.querySelector('section:nth-of-type(2)')
                  featuredSection?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Play Today's Games
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10 px-8"
                onClick={() => {
                  // Navigate to profile page
                  window.location.href = '/profile'
                }}
              >
                View Your Stats
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}