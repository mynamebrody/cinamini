"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Shield, 
  Users, 
  Activity, 
  AlertTriangle, 
  FileText, 
  Settings,
  Play,
  Download
} from "lucide-react"
import SecurityDashboard from "@/components/security/security-dashboard"
import AuditTrail from "@/components/security/audit-trail"

export default function AdminSecurityPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [securityTestRunning, setSecurityTestRunning] = useState(false)
  const [lastTestResults, setLastTestResults] = useState<any>(null)

  const runSecurityTest = async (testType: 'quick' | 'full' | 'vulnerability_scan') => {
    setSecurityTestRunning(true)
    try {
      const response = await fetch('/api/admin/security/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testType })
      })

      if (response.ok) {
        const results = await response.json()
        setLastTestResults(results)
      } else {
        console.error('Security test failed')
      }
    } catch (error) {
      console.error('Error running security test:', error)
    } finally {
      setSecurityTestRunning(false)
    }
  }

  const exportSecurityReport = async (format: 'json' | 'pdf' | 'csv') => {
    try {
      const response = await fetch('/api/admin/security/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `security-report.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting report:', error)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Security Administration
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor, test, and manage security across CineMini
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => exportSecurityReport('json')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button 
            onClick={() => runSecurityTest('quick')}
            disabled={securityTestRunning}
          >
            <Play className="h-4 w-4 mr-2" />
            {securityTestRunning ? 'Running...' : 'Quick Scan'}
          </Button>
        </div>
      </div>

      {/* Security Status Alert */}
      <SecurityStatusAlert />

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="testing">Security Testing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SecurityOverview />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <SecurityDashboard />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <AuditTrail />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <SecurityTesting 
            onRunTest={runSecurityTest}
            isRunning={securityTestRunning}
            lastResults={lastTestResults}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SecurityStatusAlert() {
  // This would normally fetch real status data
  const systemStatus = {
    status: 'healthy' as const,
    criticalAlerts: 0,
    highAlerts: 2,
    lastScan: '2 hours ago'
  }

  if (systemStatus.status === 'healthy' && systemStatus.criticalAlerts === 0) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>System Secure</AlertTitle>
        <AlertDescription>
          All security systems are operational. Last security scan: {systemStatus.lastScan}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Security Issues Detected</AlertTitle>
      <AlertDescription>
        {systemStatus.criticalAlerts > 0 && 
          `${systemStatus.criticalAlerts} critical alerts require immediate attention. `
        }
        {systemStatus.highAlerts > 0 && 
          `${systemStatus.highAlerts} high-priority alerts need review.`
        }
      </AlertDescription>
    </Alert>
  )
}

function SecurityOverview() {
  const overviewStats = [
    {
      title: "Active Users",
      value: "1,234",
      icon: <Users className="h-4 w-4" />,
      trend: "+12% from last month"
    },
    {
      title: "Security Score",
      value: "87/100",
      icon: <Shield className="h-4 w-4" />,
      trend: "+5 points from last scan"
    },
    {
      title: "Failed Logins (24h)",
      value: "23",
      icon: <AlertTriangle className="h-4 w-4" />,
      trend: "-8% from yesterday"
    },
    {
      title: "API Requests (24h)",
      value: "45.2K",
      icon: <Activity className="h-4 w-4" />,
      trend: "+15% from yesterday"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                {stat.icon}
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.trend}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>
            Latest security activities and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                type: 'Authentication',
                message: 'Failed login attempt blocked',
                time: '2 minutes ago',
                severity: 'medium'
              },
              {
                type: 'Rate Limiting',
                message: 'Rate limit exceeded for IP 192.168.1.100',
                time: '15 minutes ago',
                severity: 'low'
              },
              {
                type: 'Access Control',
                message: 'Unauthorized admin access attempt',
                time: '1 hour ago',
                severity: 'high'
              }
            ].map((event, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{event.type}</Badge>
                    <Badge 
                      variant={
                        event.severity === 'high' ? 'destructive' : 
                        event.severity === 'medium' ? 'secondary' : 'outline'
                      }
                    >
                      {event.severity}
                    </Badge>
                  </div>
                  <p className="text-sm">{event.message}</p>
                  <p className="text-xs text-muted-foreground">{event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UserManagement() {
  const [users] = useState([
    {
      id: '1',
      email: 'user@example.com',
      role: 'user',
      status: 'active',
      lastLogin: '2024-01-20T10:30:00Z',
      failedLogins: 0
    },
    {
      id: '2', 
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2024-01-20T09:15:00Z',
      failedLogins: 0
    },
    {
      id: '3',
      email: 'suspicious@example.com',
      role: 'user',
      status: 'suspended',
      lastLogin: '2024-01-19T15:45:00Z',
      failedLogins: 8
    }
  ])

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Manage user accounts and security settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{user.email}</span>
                  <Badge variant="outline">{user.role}</Badge>
                  <Badge 
                    variant={user.status === 'active' ? 'default' : 'destructive'}
                  >
                    {user.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Last login: {new Date(user.lastLogin).toLocaleString()}
                  {user.failedLogins > 0 && (
                    <span className="text-red-600 ml-2">
                      • {user.failedLogins} failed login attempts
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {user.status === 'suspended' ? (
                  <Button variant="outline" size="sm">
                    Reactivate
                  </Button>
                ) : (
                  <Button variant="outline" size="sm">
                    Suspend
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  Reset Password
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function SecurityTesting({ 
  onRunTest, 
  isRunning, 
  lastResults 
}: {
  onRunTest: (type: 'quick' | 'full' | 'vulnerability_scan') => void
  isRunning: boolean
  lastResults: any
}) {
  return (
    <div className="space-y-6">
      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Security Testing</CardTitle>
          <CardDescription>
            Run automated security tests and vulnerability scans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={() => onRunTest('quick')}
              disabled={isRunning}
            >
              <Play className="h-4 w-4 mr-2" />
              Quick Test
            </Button>
            <Button 
              onClick={() => onRunTest('full')}
              disabled={isRunning}
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              Full Security Scan
            </Button>
            <Button 
              onClick={() => onRunTest('vulnerability_scan')}
              disabled={isRunning}
              variant="outline"
            >
              <Play className="h-4 w-4 mr-2" />
              Vulnerability Scan
            </Button>
          </div>
          
          {isRunning && (
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span>Security test in progress...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {lastResults && (
        <Card>
          <CardHeader>
            <CardTitle>Last Test Results</CardTitle>
            <CardDescription>
              Test completed on {new Date(lastResults.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Overall Security Score</span>
                <Badge 
                  variant={
                    lastResults.overallSecurityScore >= 90 ? 'default' :
                    lastResults.overallSecurityScore >= 70 ? 'secondary' : 'destructive'
                  }
                >
                  {lastResults.overallSecurityScore}/100
                </Badge>
              </div>
              
              {lastResults.vulnerabilityScan && (
                <div>
                  <h4 className="font-medium mb-2">Vulnerabilities Found</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {lastResults.vulnerabilityScan.vulnerabilitiesBySeverity.critical || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Critical</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {lastResults.vulnerabilityScan.vulnerabilitiesBySeverity.high || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">High</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {lastResults.vulnerabilityScan.vulnerabilitiesBySeverity.medium || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Medium</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {lastResults.vulnerabilityScan.vulnerabilitiesBySeverity.low || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Low</div>
                    </div>
                  </div>
                </div>
              )}
              
              {lastResults.recommendations && lastResults.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <ul className="space-y-1 text-sm">
                    {lastResults.recommendations.slice(0, 5).map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SecuritySettings() {
  const [settings, setSettings] = useState({
    rateLimitEnabled: true,
    csrfProtection: true,
    auditLogging: true,
    securityHeaders: true,
    bruteForceProtection: true,
    sessionTimeout: 24,
    maxFailedLogins: 5,
    alertThreshold: 'medium'
  })

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Configuration</CardTitle>
          <CardDescription>
            Configure security settings and policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Protection Features</h4>
              
              <div className="flex items-center justify-between">
                <label className="text-sm">Rate Limiting</label>
                <input
                  type="checkbox"
                  checked={settings.rateLimitEnabled}
                  onChange={(e) => updateSetting('rateLimitEnabled', e.target.checked)}
                  className="rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm">CSRF Protection</label>
                <input
                  type="checkbox"
                  checked={settings.csrfProtection}
                  onChange={(e) => updateSetting('csrfProtection', e.target.checked)}
                  className="rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm">Security Headers</label>
                <input
                  type="checkbox"
                  checked={settings.securityHeaders}
                  onChange={(e) => updateSetting('securityHeaders', e.target.checked)}
                  className="rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm">Brute Force Protection</label>
                <input
                  type="checkbox"
                  checked={settings.bruteForceProtection}
                  onChange={(e) => updateSetting('bruteForceProtection', e.target.checked)}
                  className="rounded"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Thresholds & Limits</h4>
              
              <div className="space-y-2">
                <label className="text-sm">Session Timeout (hours)</label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                  min="1"
                  max="72"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm">Max Failed Logins</label>
                <input
                  type="number"
                  value={settings.maxFailedLogins}
                  onChange={(e) => updateSetting('maxFailedLogins', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded"
                  min="3"
                  max="20"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm">Alert Threshold</label>
                <select
                  value={settings.alertThreshold}
                  onChange={(e) => updateSetting('alertThreshold', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical Only</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <Button>Save Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}