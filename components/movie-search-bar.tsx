"use client"

import { useState, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface MovieSearchBarProps {
  onSearch: (query: string) => void
  loading?: boolean
  placeholder?: string
}

export function MovieSearchBar({ 
  onSearch, 
  loading = false, 
  placeholder = "Search for movies..." 
}: MovieSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Handle search submission
  const handleSearch = useCallback(() => {
    const trimmedQuery = searchQuery.trim()
    if (trimmedQuery.length > 0) {
      onSearch(trimmedQuery)
    }
  }, [searchQuery, onSearch])

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  return (
    <div className="flex w-full max-w-2xl mx-auto gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          className="pl-10 pr-4 bg-background/50 backdrop-blur-sm border-white/20 text-white placeholder:text-gray-400 focus:border-[#2b725e] focus:ring-[#2b725e]"
          disabled={loading}
          maxLength={100}
        />
      </div>
      <Button
        onClick={handleSearch}
        disabled={loading || searchQuery.trim().length === 0}
        className="bg-[#2b725e] hover:bg-[#235e4c] text-white min-w-[100px]"
        type="button"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Search
          </>
        )}
      </Button>
    </div>
  )
}