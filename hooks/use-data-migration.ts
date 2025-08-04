"use client"

import { useEffect, useState } from 'react'
import { localGameStorage } from '@/lib/local-game-storage'
import { migrateLocalDataToAccount } from '@/lib/data-migration'
import { useRouter } from 'next/navigation'

export function useDataMigration(userId: string | null) {
  const [hasPendingData, setHasPendingData] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationComplete, setMigrationComplete] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!userId) return

    // Check if user has local data to migrate
    const checkLocalData = async () => {
      const recentResults = localGameStorage.getRecentResults(7)
      const hasMigrated = localStorage.getItem(`migrated-${userId}`)
      
      if (recentResults.length > 0 && !hasMigrated) {
        setHasPendingData(true)
      }
    }

    checkLocalData()
  }, [userId])

  const performMigration = async () => {
    if (!userId || migrating) return

    setMigrating(true)
    try {
      const result = await migrateLocalDataToAccount(userId)
      
      if (result.success) {
        // Mark migration as complete for this user
        localStorage.setItem(`migrated-${userId}`, 'true')
        setMigrationComplete(true)
        setHasPendingData(false)
        
        // Refresh the page to show updated stats
        setTimeout(() => {
          router.refresh()
        }, 2000)
      }
      
      return result
    } catch (error) {
      console.error('Migration error:', error)
      return { success: false, migratedCount: 0, errors: ['Migration failed'] }
    } finally {
      setMigrating(false)
    }
  }

  const dismissMigration = () => {
    if (userId) {
      localStorage.setItem(`migrated-${userId}`, 'dismissed')
      setHasPendingData(false)
    }
  }

  return {
    hasPendingData,
    migrating,
    migrationComplete,
    performMigration,
    dismissMigration
  }
}