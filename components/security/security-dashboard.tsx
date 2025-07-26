"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Shield, Activity, Users, Clock, CheckCircle, XCircle } from "lucide-react"
import { SecurityDashboardData, SecurityAlert, SecurityMetrics } from "@/lib/security/monitoring"

interface SecurityDashboardProps {
  className?: string
}

export function SecurityDashboard({ className }: SecurityDashboardProps) {
  const [dashboardData, setDashboardData] = useState<SecurityDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchDashboardData()
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    setRefreshInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/security/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      
      const data = await response.json()
      setDashboardData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/security/alerts/${alertId}/resolve`, {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchDashboardData() // Refresh data
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err)
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!dashboardData) return null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* System Health Overview */}
      <SystemHealthCard health={dashboardData.systemHealth} />

      {/* Security Metrics Cards */}
      <SecurityMetricsCards metrics={dashboardData.metrics} />

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <ActiveAlertsSection 
            alerts={dashboardData.alerts} 
            onResolveAlert={resolveAlert}
          />
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <RecentEventsSection events={dashboardData.recentEvents} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SecurityAnalytics metrics={dashboardData.metrics} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SystemHealthCard({ health }: { health: SecurityDashboardData['systemHealth'] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />
      default: return <Activity className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getStatusIcon(health.status)}
            System Health
          </CardTitle>
          <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>
            {health.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Uptime</p>
            <p className="text-2xl font-bold">
              {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Check</p>
            <p className="text-sm">
              {new Date(health.lastCheck).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        {health.issues.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-red-600 mb-2">Issues:</p>
            <ul className="text-sm space-y-1">
              {health.issues.map((issue, i) => (
                <li key={i} className="text-red-600">• {issue}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SecurityMetricsCards({ metrics }: { metrics: SecurityMetrics }) {
  const cards = [
    {
      title: "Total Requests",
      value: metrics.totalRequests.toLocaleString(),
      description: "in the last hour",
      icon: <Activity className="h-4 w-4" />
    },
    {
      title: "Security Events", 
      value: metrics.securityEvents.toString(),
      description: `${metrics.blockedRequests} blocked`,
      icon: <Shield className="h-4 w-4" />,
      trend: metrics.securityEvents > 10 ? 'high' : 'normal'
    },
    {
      title: "Failed Logins",
      value: metrics.failedLogins.toString(),
      description: "authentication failures",
      icon: <Users className="h-4 w-4" />,
      trend: metrics.failedLogins > 5 ? 'high' : 'normal'
    },
    {
      title: "Error Rate",
      value: `${(metrics.errorRate * 100).toFixed(2)}%`,
      description: "of total requests",
      icon: <AlertTriangle className="h-4 w-4" />,
      trend: metrics.errorRate > 0.05 ? 'high' : 'normal'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              {card.icon}
            </div>
            <div className="space-y-1">
              <div className={`text-2xl font-bold ${
                card.trend === 'high' ? 'text-red-600' : ''
              }`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ActiveAlertsSection({ 
  alerts, 
  onResolveAlert 
}: { 
  alerts: SecurityAlert[]
  onResolveAlert: (alertId: string) => void
}) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-lg font-medium">No Active Alerts</p>
          <p className="text-muted-foreground">Your system is secure</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <AlertCard 
          key={alert.id} 
          alert={alert} 
          onResolve={() => onResolveAlert(alert.id)}
        />
      ))}
    </div>
  )
}

function AlertCard({ 
  alert, 
  onResolve 
}: { 
  alert: SecurityAlert
  onResolve: () => void
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200'
      case 'high': return 'bg-orange-50 border-orange-200'
      case 'medium': return 'bg-yellow-50 border-yellow-200'
      case 'low': return 'bg-blue-50 border-blue-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  return (
    <Card className={getSeverityColor(alert.severity)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{alert.title}</CardTitle>
              <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                {alert.severity.toUpperCase()}
              </Badge>
            </div>
            <CardDescription>
              {alert.description}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onResolve}
          >
            Resolve
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Time:</span>
            <p>{new Date(alert.timestamp).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">IP Address:</span>
            <p className="font-mono">{alert.ipAddress}</p>
          </div>
          {alert.userId && (
            <div>
              <span className="text-muted-foreground">User ID:</span>
              <p className="font-mono">{alert.userId}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Event Type:</span>
            <p>{alert.eventType}</p>
          </div>
        </div>
        
        {Object.keys(alert.metadata).length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Additional Details:</p>
            <div className="bg-gray-100 p-3 rounded text-xs font-mono">
              <pre>{JSON.stringify(alert.metadata, null, 2)}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentEventsSection({ events }: { events: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Security Events</CardTitle>
        <CardDescription>
          Latest security-related activities in your system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {events.map((event, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {event.eventType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{event.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    IP: {event.ipAddress}
                    {event.userId && ` • User: ${event.userId}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function SecurityAnalytics({ metrics }: { metrics: SecurityMetrics }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Analysis</CardTitle>
          <CardDescription>Breakdown of system activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Successful Requests</span>
              <span>{((1 - metrics.errorRate) * 100).toFixed(1)}%</span>
            </div>
            <Progress value={(1 - metrics.errorRate) * 100} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Error Rate</span>
              <span>{(metrics.errorRate * 100).toFixed(1)}%</span>
            </div>
            <Progress 
              value={metrics.errorRate * 100} 
              className="h-2"
              // @ts-ignore
              color={metrics.errorRate > 0.05 ? 'red' : 'yellow'}
            />
          </div>

          <div className="pt-4">
            <p className="text-sm text-muted-foreground">Average Response Time</p>
            <p className="text-2xl font-bold">
              {metrics.averageResponseTime}ms
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Violations</CardTitle>
          <CardDescription>Types of security events detected</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Rate Limit Violations</span>
              <Badge variant="secondary">{metrics.rateLimitViolations}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">CSRF Violations</span>
              <Badge variant="secondary">{metrics.csrfViolations}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Failed Logins</span>
              <Badge variant="secondary">{metrics.failedLogins}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Suspicious IPs</span>
              <Badge variant="secondary">{metrics.suspiciousIPs.length}</Badge>
            </div>
          </div>

          {metrics.suspiciousIPs.length > 0 && (
            <div className="pt-4">
              <p className="text-sm font-medium mb-2">Suspicious IP Addresses:</p>
              <div className="space-y-1">
                {metrics.suspiciousIPs.slice(0, 5).map((ip, i) => (
                  <p key={i} className="text-xs font-mono bg-gray-100 p-2 rounded">
                    {ip}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SecurityDashboard