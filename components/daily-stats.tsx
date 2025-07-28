"use client"

import { Card } from "@/components/ui/card"
import { Trophy, Users, Clock, Target } from "lucide-react"

export default function DailyStats() {
  return (
    <section className="py-8 border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Today's Community</h2>
          <p className="text-gray-400">Join thousands of movie fans in today's challenges</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#1c1c1c] border-white/10 p-6 text-center">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">2.4k</div>
            <div className="text-sm text-gray-400">Players Today</div>
          </Card>
          
          <Card className="bg-[#1c1c1c] border-white/10 p-6 text-center">
            <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">847</div>
            <div className="text-sm text-gray-400">Perfect Scores</div>
          </Card>
          
          <Card className="bg-[#1c1c1c] border-white/10 p-6 text-center">
            <Clock className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">2m 15s</div>
            <div className="text-sm text-gray-400">Avg. Time</div>
          </Card>
          
          <Card className="bg-[#1c1c1c] border-white/10 p-6 text-center">
            <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">73%</div>
            <div className="text-sm text-gray-400">Success Rate</div>
          </Card>
        </div>
      </div>
    </section>
  )
}