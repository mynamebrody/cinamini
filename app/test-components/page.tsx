"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { AlertCircle, CheckCircle, Info } from "lucide-react"

export default function TestComponentsPage() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground font-funnel-display-bold">
            Component Testing Page
          </h1>
          <ThemeToggle />
        </div>

        {/* Cards Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground font-funnel-display-bold">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>A basic card with default styling</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">This is the content of the default card.</p>
              </CardContent>
            </Card>

            <Card variant="interactive">
              <CardHeader>
                <CardTitle>Interactive Card</CardTitle>
                <CardDescription>Hover to see the cinema red effect</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">This card has hover effects.</p>
              </CardContent>
            </Card>

            <Card variant="featured">
              <CardHeader>
                <CardTitle>Featured Card</CardTitle>
                <CardDescription>Enhanced shadows and animations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">This card has enhanced styling.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Buttons Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground font-funnel-display-bold">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="destructive">Destructive Button</Button>
            <Button variant="icon">🎬</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>

        {/* Inputs Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground font-funnel-display-bold">Inputs</h2>
          <div className="space-y-4 max-w-md">
            <Input placeholder="Enter your name..." />
            <Input type="email" placeholder="Enter your email..." />
            <Input type="password" placeholder="Enter your password..." />
            <Input disabled placeholder="Disabled input..." />
          </div>
        </div>

        {/* Alerts Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground font-funnel-display-bold">Alerts</h2>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>This is a default informational alert.</AlertDescription>
            </Alert>

            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>Your action was completed successfully!</AlertDescription>
            </Alert>

            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>Please check your input before proceeding.</AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>There was an error processing your request.</AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground font-funnel-display-bold">Tabs</h2>
          <Tabs defaultValue="retitled" className="w-full">
            <TabsList>
              <TabsTrigger value="retitled">Retitled 🇪🇸</TabsTrigger>
              <TabsTrigger value="budget">Budget Bracket 💰</TabsTrigger>
              <TabsTrigger value="cast">Cast Climb 🎬</TabsTrigger>
              <TabsTrigger value="poster">Poster Pixels 🎨</TabsTrigger>
            </TabsList>
            <TabsContent value="retitled" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Retitled Game</CardTitle>
                  <CardDescription>Guess movies from their foreign titles</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    A daily localized title guessing game featuring movies from around the world.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="budget" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Budget Bracket</CardTitle>
                  <CardDescription>Progressive movie budget elimination game</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Compare movie budgets and survive all rounds for a perfect game.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="cast" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cast Climb</CardTitle>
                  <CardDescription>Progressive cast member reveals</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Guess the movie as actors are revealed one by one.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="poster" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Poster Pixels</CardTitle>
                  <CardDescription>Progressive poster clarity reveals</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Guess the movie from increasingly clear poster images.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Theme Demo */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground font-funnel-display-bold">Theme Testing</h2>
          <Card>
            <CardHeader>
              <CardTitle>Cinema Design System</CardTitle>
              <CardDescription>Test the theme switching functionality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                This page demonstrates all the updated components with full light/dark mode support
                while preserving the cinamini cinema aesthetic.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Toggle theme:</span>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}