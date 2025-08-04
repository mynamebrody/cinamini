"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Download, X } from "lucide-react"
import { localGameStorage } from "@/lib/local-game-storage"
import { useDataMigration } from "@/hooks/use-data-migration"

interface DataMigrationPromptProps {
  userId: string
}

export default function DataMigrationPrompt({ userId }: DataMigrationPromptProps) {
  const {
    hasPendingData,
    migrating,
    migrationComplete,
    performMigration,
    dismissMigration
  } = useDataMigration(userId)

  if (!hasPendingData || migrationComplete) {
    return null
  }

  const stats = localGameStorage.getStats()
  const recentGames = localGameStorage.getRecentResults(7).length

  return (
    <Card className="border-blue-200 bg-gradient-to-b from-blue-50 to-white">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">Welcome Back! Import Your Progress?</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissMigration}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-600 mb-4">
          We found game data on this device. Would you like to import it to your account?
        </p>
        
        <div className="bg-white rounded-lg p-3 mb-4 space-y-1">
          <div className="text-sm">
            <span className="font-medium">{recentGames}</span> recent games
          </div>
          {stats.streakData.current > 0 && (
            <div className="text-sm">
              <span className="font-medium">{stats.streakData.current}</span> day streak
            </div>
          )}
          <div className="text-sm">
            <span className="font-medium">{stats.totalGamesPlayed}</span> total games played
          </div>
        </div>

        {migrationComplete && (
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Data imported successfully!</span>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={performMigration}
            disabled={migrating}
            variant="primary"
            className="flex-1"
          >
            {migrating ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-pulse" />
                Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Import Data
              </>
            )}
          </Button>
          <Button
            onClick={dismissMigration}
            variant="ghost"
            disabled={migrating}
          >
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}