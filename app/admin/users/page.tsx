"use client"

import { useState } from "react"
import { Mail, Send, UserPlus, CheckCircle, AlertCircle, Loader2, Link, Copy } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ApiResponse {
  success?: boolean
  message?: string
  error?: string
  user?: {
    id: string
    email: string
    created_at: string
  }
}

interface GenerateLinkResponse {
  success?: boolean
  error?: string
  link?: string
  type?: string
  email?: string
  expiresAt?: string
  hashed_token?: string
}

export default function UserControlsPage() {
  // Resend confirmation state
  const [resendEmail, setResendEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendResult, setResendResult] = useState<ApiResponse | null>(null)

  // Invite user state
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<ApiResponse | null>(null)

  // Generate link state
  const [linkEmail, setLinkEmail] = useState("")
  const [linkType, setLinkType] = useState("")
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkResult, setLinkResult] = useState<GenerateLinkResponse | null>(null)

  const handleResendConfirmation = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!resendEmail.trim()) {
      setResendResult({ error: "Email address is required" })
      return
    }

    setResendLoading(true)
    setResendResult(null)

    try {
      const response = await fetch("/api/admin/auth/resend-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: resendEmail.trim() }),
      })

      const data: ApiResponse = await response.json()
      setResendResult(data)

      if (data.success) {
        setResendEmail("") // Clear form on success
      }
    } catch (error) {
      console.error("Error resending confirmation:", error)
      setResendResult({ error: "Network error. Please try again." })
    } finally {
      setResendLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inviteEmail.trim()) {
      setInviteResult({ error: "Email address is required" })
      return
    }

    setInviteLoading(true)
    setInviteResult(null)

    try {
      const response = await fetch("/api/admin/auth/invite-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })

      const data: ApiResponse = await response.json()
      setInviteResult(data)

      if (data.success) {
        setInviteEmail("") // Clear form on success
      }
    } catch (error) {
      console.error("Error inviting user:", error)
      setInviteResult({ error: "Network error. Please try again." })
    } finally {
      setInviteLoading(false)
    }
  }

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!linkEmail.trim()) {
      setLinkResult({ error: "Email address is required" })
      return
    }

    if (!linkType) {
      setLinkResult({ error: "Link type is required" })
      return
    }

    setLinkLoading(true)
    setLinkResult(null)

    try {
      const response = await fetch("/api/admin/auth/generate-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: linkEmail.trim(), 
          type: linkType 
        }),
      })

      const data: GenerateLinkResponse = await response.json()
      setLinkResult(data)

      if (data.success) {
        // Don't clear form on success so user can generate multiple links
      }
    } catch (error) {
      console.error("Error generating link:", error)
      setLinkResult({ error: "Network error. Please try again." })
    } finally {
      setLinkLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-funnel-display-bold text-neutral-900 mb-2">User Controls</h1>
        <p className="text-neutral-600 font-funnel">Manage user accounts and email communications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Resend Email Confirmation */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-funnel-display-bold">
              <Mail className="w-5 h-5 text-cinema-red" />
              Resend Email Confirmation
            </CardTitle>
            <CardDescription className="font-funnel text-neutral-600">
              Resend a confirmation email to users who haven't verified their email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleResendConfirmation} className="space-y-4">
              <div>
                <Label htmlFor="resend-email" className="font-funnel font-medium">Email Address</Label>
                <Input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="admin-input mt-1"
                  disabled={resendLoading}
                />
              </div>

              <Button 
                type="submit" 
                disabled={resendLoading || !resendEmail.trim()}
                className="admin-btn-primary w-full"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Resend Confirmation
                  </>
                )}
              </Button>
            </form>

            {resendResult && (
              <Alert className={resendResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {resendResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-cinema-red" />
                )}
                <AlertTitle className={resendResult.success ? "text-green-800" : "text-red-800"}>
                  {resendResult.success ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription className={resendResult.success ? "text-green-700" : "text-red-700"}>
                  {resendResult.message || resendResult.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Invite User */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-funnel-display-bold">
              <UserPlus className="w-5 h-5 text-cinema-red" />
              Invite User
            </CardTitle>
            <CardDescription className="font-funnel text-neutral-600">
              Send an invitation email to create a new user account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="newuser@example.com"
                  disabled={inviteLoading}
                  className="mt-1"
                />
              </div>

              <Button 
                type="submit" 
                disabled={inviteLoading || !inviteEmail.trim()}
                className="w-full"
              >
                {inviteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>

            {inviteResult && (
              <Alert className={inviteResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {inviteResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-cinema-red" />
                )}
                <AlertTitle className={inviteResult.success ? "text-green-800" : "text-red-800"}>
                  {inviteResult.success ? "Invitation Sent" : "Error"}
                </AlertTitle>
                <AlertDescription className={inviteResult.success ? "text-green-700" : "text-red-700"}>
                  {inviteResult.message || inviteResult.error}
                  {inviteResult.user && (
                    <div className="mt-2 text-sm">
                      <strong>User ID:</strong> {inviteResult.user.id}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Generate Links */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-funnel-display-bold">
              <Link className="w-5 h-5 text-cinema-red" />
              Generate Admin Link
            </CardTitle>
            <CardDescription className="font-funnel text-neutral-600">
              Generate authentication links for testing and development
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleGenerateLink} className="space-y-4">
              <div>
                <Label htmlFor="link-email">Email Address</Label>
                <Input
                  id="link-email"
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  placeholder="user@example.com"
                  disabled={linkLoading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="link-type">Link Type</Label>
                <Select value={linkType} onValueChange={setLinkType} disabled={linkLoading}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select link type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-md z-50">
                    <SelectItem value="signup">Signup</SelectItem>
                    <SelectItem value="magiclink">Magic Link</SelectItem>
                    <SelectItem value="invite">Invite</SelectItem>
                    <SelectItem value="recovery">Password Recovery</SelectItem>
                    <SelectItem value="email_change_current">Email Change (Current)</SelectItem>
                    <SelectItem value="email_change_new">Email Change (New)</SelectItem>
                    <SelectItem value="phone_change">Phone Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                disabled={linkLoading || !linkEmail.trim() || !linkType}
                className="w-full"
              >
                {linkLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    Generate Link
                  </>
                )}
              </Button>
            </form>

            {linkResult && (
              <div className="space-y-3">
                {linkResult.success && linkResult.link ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-green-800">Generated Link:</Label>
                    <div className="relative">
                      <div className="bg-gray-100 border rounded-lg p-3 text-sm font-mono break-all pr-12">
                        {linkResult.link}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="absolute top-1 right-1 h-8 w-8 p-0"
                        onClick={() => copyToClipboard(linkResult.link!)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-500">
                      Type: {linkResult.type} | Email: {linkResult.email}
                      {linkResult.expiresAt && (
                        <> | Expires: {new Date(linkResult.expiresAt).toLocaleString()}</>
                      )}
                    </div>
                  </div>
                ) : (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-cinema-red" />
                    <AlertTitle className="text-red-800">Error</AlertTitle>
                    <AlertDescription className="text-red-700">
                      {linkResult.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Instructions */}
      <Card className="admin-card bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 font-funnel-display-bold">Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-800 font-funnel">
          <div>
            <strong>Resend Email Confirmation:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 ml-4">
              <li>Use this for users who signed up but haven't confirmed their email</li>
              <li>The user must have already registered but not verified their email</li>
              <li>Rate limited to prevent spam</li>
            </ul>
          </div>
          <div>
            <strong>Invite User:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 ml-4">
              <li>Creates a new user account and sends an invitation email</li>
              <li>The email address must not already be registered</li>
              <li>User will receive an email to set their password</li>
            </ul>
          </div>
          <div>
            <strong>Generate Admin Link:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 ml-4">
              <li>Creates direct authentication links for testing and development</li>
              <li>Links bypass email delivery and can be used immediately</li>
              <li>Choose from different link types based on your use case</li>
              <li>Copy the generated link to clipboard with the copy button</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}