"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, Edit2, Save, X, User, Mail } from "lucide-react"

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
      <Card className="bg-[#1c1c1c] border-gray-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-400">Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card className="bg-[#1c1c1c] border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-400">Failed to load profile</p>
            <Button 
              onClick={fetchProfile} 
              variant="outline" 
              className="mt-4 border-white/20 text-white hover:bg-white/10"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#1c1c1c] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <User className="h-5 w-5" />
          Account Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Message */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Username Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 px-4 py-3 rounded-lg">
            <p className="text-sm font-medium mb-2">Try these available usernames:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => applySuggestion(suggestion)}
                  className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-md text-blue-300 hover:text-blue-200 transition-colors text-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Email Field (Read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-300 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={profile.email}
            disabled
            className="bg-gray-800/50 border-gray-700 text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500">
            Email cannot be changed. Contact support if you need to update your email.
          </p>
        </div>

        {/* Username Field */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-gray-300 flex items-center gap-2">
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
                className="bg-[#161616] border-gray-700 text-white placeholder:text-gray-500"
                disabled={isSaving}
                autoFocus
              />
              
              {/* Real-time Validation Error */}
              {validationError && (
                <p className="text-red-400 text-sm">{validationError}</p>
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
                  className="bg-[#2b725e] hover:bg-[#235e4c] text-white"
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
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
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
                  className="bg-gray-800/50 border-gray-700 text-white flex-1"
                />
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
              
              {!profile.username && (
                <p className="text-sm text-yellow-400">
                  You haven't set a username yet. Click "Edit" to add one.
                </p>
              )}
            </div>
          )}
          
          <p className="text-xs text-gray-500">
            Your username is visible to other users and can be changed up to 5 times per hour.
          </p>
        </div>

        {/* Account Details */}
        <div className="pt-4 border-t border-gray-700 space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Account Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <span className="font-medium">Member since:</span>
              <br />
              {new Date(profile.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div>
              <span className="font-medium">Last updated:</span>
              <br />
              {new Date(profile.updatedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}