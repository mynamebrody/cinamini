"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, Edit2, Save, X, User, Mail } from "lucide-react"
import { FavoriteFilmsSection } from "@/components/favorite-films-section"

interface ProfileData {
  email: string
  username: string | null
  createdAt: string
  updatedAt: string
}

interface ApiError {
  error: string
}

export default function ProfileForm() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedUsername, setEditedUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Fetch profile data
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/profile')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile')
      }
      
      setProfile(data)
      setEditedUsername(data.username || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Real-time username validation
  const validateUsername = (username: string): string | null => {
    if (!username.trim()) {
      return "Username is required"
    }
    
    const trimmed = username.trim()
    
    if (trimmed.length < 3) {
      return "Username must be at least 3 characters long"
    }
    
    if (trimmed.length > 20) {
      return "Username must be no longer than 20 characters"
    }
    
    const validChars = /^[a-zA-Z0-9_-]+$/
    if (!validChars.test(trimmed)) {
      return "Username can only contain letters, numbers, underscores, and hyphens"
    }
    
    return null
  }

  // Handle username input change with validation
  const handleUsernameChange = (value: string) => {
    setEditedUsername(value)
    setValidationError(validateUsername(value))
    setError(null)
    setSuccess(null)
    setSuggestions([])
  }

  // Start editing mode
  const handleEdit = () => {
    setIsEditing(true)
    setEditedUsername(profile?.username || "")
    setValidationError(null)
    setError(null)
    setSuccess(null)
    setSuggestions([])
  }

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false)
    setEditedUsername(profile?.username || "")
    setValidationError(null)
    setError(null)
    setSuccess(null)
    setSuggestions([])
  }

  // Apply suggested username
  const applySuggestion = (suggestion: string) => {
    setEditedUsername(suggestion)
    setSuggestions([])
    setError(null)
    setValidationError(null)
  }

  // Generate username suggestions
  const generateUsernameSuggestions = (baseUsername: string): string[] => {
    const suggestions = []
    const base = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    // Add random numbers
    for (let i = 0; i < 3; i++) {
      const randomNum = Math.floor(Math.random() * 999) + 1
      suggestions.push(`${base}${randomNum}`)
    }
    
    // Add year
    const currentYear = new Date().getFullYear()
    suggestions.push(`${base}${currentYear}`)
    
    // Add common suffixes
    const suffixes = ['_user', '_player', '_gamer']
    suffixes.forEach(suffix => {
      if (base.length + suffix.length <= 20) {
        suggestions.push(`${base}${suffix}`)
      }
    })
    
    return suggestions.slice(0, 3) // Return top 3 suggestions
  }

  // Save username
  const handleSave = async () => {
    const validation = validateUsername(editedUsername)
    if (validation) {
      setValidationError(validation)
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: editedUsername.trim(),
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        const errorMessage = data.error || 'Failed to update username'
        
        // If username is taken, generate and store suggestions
        if (response.status === 409) {
          const usernameSuggestions = generateUsernameSuggestions(editedUsername.trim())
          setSuggestions(usernameSuggestions)
        } else {
          setSuggestions([])
        }
        
        throw new Error(errorMessage)
      }
      
      // Update local state with new data
      setProfile(data)
      setIsEditing(false)
      setSuccess("Username updated successfully!")
      setValidationError(null)
      setSuggestions([])
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update username')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !validationError && !isSaving) {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-white border border-[rgb(var(--silver))]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-600">Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card className="bg-white border border-[rgb(var(--silver))]">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-cinema-red">Failed to load profile</p>
            <Button 
              onClick={fetchProfile} 
              variant="outline" 
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-white border border-[rgb(var(--silver))]">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2 font-funnel-display-bold">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Username Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            <p className="text-sm font-medium mb-2">Try these available usernames:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => applySuggestion(suggestion)}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-md text-blue-700 hover:text-blue-800 transition-colors text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Email Field (Read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={profile.email}
            disabled
            className="bg-gray-50 border border-[rgb(var(--silver))] text-gray-600 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500">
            Email cannot be changed. Contact support if you need to update your email.
          </p>
        </div>

        {/* Username Field */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-gray-700 flex items-center gap-2">
            <User className="h-4 w-4" />
            Username
          </Label>
          
          {isEditing ? (
            <div className="space-y-2">
              <Input
                id="username"
                type="text"
                value={editedUsername}
                onChange={(e) => handleUsernameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter username (3-20 characters)"
                className="bg-white border border-[rgb(var(--silver))] text-gray-900 placeholder:text-gray-500"
                disabled={isSaving}
                autoFocus
              />
              
              {/* Real-time Validation Error */}
              {validationError && (
                <p className="text-cinema-red text-sm">{validationError}</p>
              )}
              
              {/* Character Count */}
              <p className="text-xs text-gray-500">
                {editedUsername.length}/20 characters
              </p>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!!validationError || isSaving || !editedUsername.trim()}
                  variant="default"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Input
                  value={profile.username || "Not set"}
                  disabled
                  className="bg-gray-50 border border-[rgb(var(--silver))] text-gray-900 flex-1"
                />
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  size="sm"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
              
              {!profile.username && (
                <p className="text-sm text-amber-600">
                  You haven't set a username yet. Click "Edit" to add one.
                </p>
              )}
            </div>
          )}
          
          <p className="text-xs text-gray-500">
            Your username can be visible to other users.
          </p>
        </div>

        {/* Account Details */}
        <div className="pt-4 border-t border-[rgb(var(--silver))] space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <span className="font-medium">Member since:</span>
              <br />
              {new Date(profile.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    
    {/* Favorite Films Section */}
    <Card className="mt-6 bg-white border border-[rgb(var(--silver))]">
      <CardHeader>
        <CardTitle className="text-gray-900 font-funnel-display-bold">Favorite Films</CardTitle>
      </CardHeader>
      <CardContent>
        <FavoriteFilmsSection />
      </CardContent>
    </Card>
    </>
  )
}