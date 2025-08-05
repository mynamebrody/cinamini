"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { localGameStorage } from '@/lib/local-game-storage'
import { migrateLocalDataToAccount } from '@/lib/data-migration'
import { useToast } from '@/hooks/use-toast'

interface AutoMigrationHandlerProps {
  userId: string
}

export default function AutoMigrationHandler({ userId }: AutoMigrationHandlerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [migrating, setMigrating] = useState(false)
  const [migrationAttempted, setMigrationAttempted] = useState(false)

  useEffect(() => {
    const isNewUser = searchParams.get('new_user') === 'true'
    const shouldMigrate = searchParams.get('migrate') === 'true'
    
    if (!isNewUser || !shouldMigrate || migrationAttempted) {
      return
    }

    const performAutoMigration = async () => {
      // Check if already migrated
      const hasMigrated = localStorage.getItem(`migrated-${userId}`)
      if (hasMigrated) {
        return
      }

      // Check if there's local data to migrate
      const recentResults = localGameStorage.getRecentResults(30) // Check last 30 days
      if (recentResults.length === 0) {
        return
      }

      setMigrating(true)
      setMigrationAttempted(true)

      try {
        const result = await migrateLocalDataToAccount(userId)
        
        if (result.success && result.migratedCount > 0) {
          // Mark migration as complete
          localStorage.setItem(`migrated-${userId}`, 'true')
          
          toast({
            title: "Welcome! Your progress has been saved",
            description: `Successfully imported ${result.migratedCount} game${result.migratedCount > 1 ? 's' : ''} to your account.`,
            duration: 5000,
          })

          // Remove the query parameters
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.delete('new_user')
          newUrl.searchParams.delete('migrate')
          router.replace(newUrl.pathname)
          
          // Refresh to show updated stats
          setTimeout(() => {
            router.refresh()
          }, 1000)
        } else if (result.errors.length > 0) {
          console.error('Migration errors:', result.errors)
        }
      } catch (error) {
        console.error('Auto migration error:', error)
      } finally {
        setMigrating(false)
      }
    }

    performAutoMigration()
  }, [userId, searchParams, router, toast, migrationAttempted])

  // Show loading state while migrating
  if (migrating) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-sm font-medium">Importing your game progress...</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}