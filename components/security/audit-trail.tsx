"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Search, 
  Download, 
  Calendar as CalendarIcon, 
  Filter, 
  RefreshCw,
  User,
  Database,
  Shield,
  Activity,
  AlertTriangle
} from "lucide-react"
import { format } from "date-fns"
import { AuditLogEntry } from "@/lib/security/audit-logger"

interface AuditTrailProps {
  className?: string
}

interface AuditFilters {
  userId: string
  eventType: string
  category: string
  severity: string
  outcome: string
  startDate: Date | undefined
  endDate: Date | undefined
}

export function AuditTrail({ className }: AuditTrailProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    hasMore: false,
    limit: 50,
    offset: 0
  })

  const [filters, setFilters] = useState<AuditFilters>({
    userId: '',
    eventType: '',
    category: '',
    severity: '',
    outcome: '',
    startDate: undefined,
    endDate: undefined
  })

  useEffect(() => {
    fetchLogs()
    fetchStatistics()
  }, [])

  const fetchLogs = async (newFilters?: Partial<AuditFilters>, offset = 0) => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      const activeFilters = { ...filters, ...newFilters }

      // Add non-empty filters to query params
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value && value !== '') {
          if (key === 'startDate' || key === 'endDate') {
            queryParams.append(key, (value as Date).toISOString())
          } else {
            queryParams.append(key, value as string)
          }
        }
      })

      queryParams.append('limit', pagination.limit.toString())
      queryParams.append('offset', offset.toString())

      const response = await fetch(`/api/admin/audit/logs?${queryParams}`)
      if (!response.ok) throw new Error('Failed to fetch audit logs')

      const data = await response.json()
      setLogs(data.logs)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async (timeframe = 'day') => {
    try {
      const response = await fetch(`/api/admin/audit/statistics?timeframe=${timeframe}`)
      if (!response.ok) throw new Error('Failed to fetch audit statistics')

      const data = await response.json()
      setStatistics(data.statistics)
    } catch (err) {
      console.error('Failed to fetch statistics:', err)
    }
  }

  const handleFilterChange = (key: keyof AuditFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
  }

  const applyFilters = () => {
    fetchLogs(filters, 0)
  }

  const resetFilters = () => {
    const resetFilters: AuditFilters = {
      userId: '',
      eventType: '',
      category: '',
      severity: '',
      outcome: '',
      startDate: undefined,
      endDate: undefined
    }
    setFilters(resetFilters)
    fetchLogs(resetFilters, 0)
  }

  const exportLogs = async (format: 'json' | 'csv' | 'xml') => {
    try {
      const response = await fetch('/api/admin/audit/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: filters,
          format
        })
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const loadMore = () => {
    if (pagination.hasMore) {
      fetchLogs(filters, pagination.offset + pagination.limit)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistics Overview */}
      {statistics && <AuditStatistics statistics={statistics} />}

      {/* Main Audit Trail */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <AuditFilters 
            filters={filters}
            onFilterChange={handleFilterChange}
            onApplyFilters={applyFilters}
            onResetFilters={resetFilters}
            onExport={exportLogs}
          />

          {/* Audit Logs Table */}
          <AuditLogsTable 
            logs={logs}
            loading={loading}
            error={error}
            pagination={pagination}
            onLoadMore={loadMore}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {statistics && <AuditAnalytics statistics={statistics} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AuditStatistics({ statistics }: { statistics: any }) {
  const cards = [
    {
      title: "Total Events",
      value: statistics.totalEvents.toLocaleString(),
      icon: <Activity className="h-4 w-4" />
    },
    {
      title: "Success Rate",
      value: `${Math.round((statistics.eventsByOutcome.success / statistics.totalEvents) * 100)}%`,
      icon: <Database className="h-4 w-4" />
    },
    {
      title: "Security Events",
      value: (statistics.eventsByCategory.security || 0).toString(),
      icon: <Shield className="h-4 w-4" />
    },
    {
      title: "Failed Events",
      value: (statistics.eventsByOutcome.failure || 0).toString(),
      icon: <AlertTriangle className="h-4 w-4" />
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
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function AuditFilters({ 
  filters, 
  onFilterChange, 
  onApplyFilters, 
  onResetFilters, 
  onExport 
}: {
  filters: AuditFilters
  onFilterChange: (key: keyof AuditFilters, value: any) => void
  onApplyFilters: () => void
  onResetFilters: () => void
  onExport: (format: 'json' | 'csv' | 'xml') => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Audit Log Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">User ID</label>
            <Input
              placeholder="Filter by user..."
              value={filters.userId}
              onChange={(e) => onFilterChange('userId', e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <Select value={filters.category} onValueChange={(value) => onFilterChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="data">Data</SelectItem>
                <SelectItem value="game">Game</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Severity</label>
            <Select value={filters.severity} onValueChange={(value) => onFilterChange('severity', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Outcome</label>
            <Select value={filters.outcome} onValueChange={(value) => onFilterChange('outcome', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All outcomes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All outcomes</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="range"
                    selected={{
                      from: filters.startDate,
                      to: filters.endDate
                    }}
                    onSelect={(range) => {
                      onFilterChange('startDate', range?.from)
                      onFilterChange('endDate', range?.to)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button onClick={onApplyFilters}>
              <Search className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
            <Button variant="outline" onClick={onResetFilters}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onExport('json')}>
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport('xml')}>
              <Download className="h-4 w-4 mr-2" />
              XML
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AuditLogsTable({ 
  logs, 
  loading, 
  error, 
  pagination, 
  onLoadMore 
}: {
  logs: AuditLogEntry[]
  loading: boolean
  error: string | null
  pagination: any
  onLoadMore: () => void
}) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail</CardTitle>
        <CardDescription>
          {pagination.total} total events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <AuditLogRow key={log.id} log={log} />
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        
        {pagination.hasMore && (
          <div className="flex justify-center pt-4">
            <Button 
              variant="outline" 
              onClick={onLoadMore}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AuditLogRow({ log }: { log: AuditLogEntry }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success': return 'default'
      case 'failure': return 'destructive'
      case 'partial': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        {format(new Date(log.timestamp), 'MMM dd HH:mm:ss')}
      </TableCell>
      <TableCell>
        <div className="font-medium">{log.eventType}</div>
        <div className="text-xs text-muted-foreground">{log.action}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{log.category}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <User className="h-3 w-3" />
          <span className="font-mono text-xs">
            {log.actorUserId?.substring(0, 8) || 'anonymous'}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {log.actorIpAddress}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={getOutcomeColor(log.outcome)}>
          {log.outcome}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={getSeverityColor(log.severity) as any}>
          {log.severity}
        </Badge>
      </TableCell>
      <TableCell className="max-w-xs truncate">
        {log.description}
      </TableCell>
    </TableRow>
  )
}

function AuditAnalytics({ statistics }: { statistics: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Events by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(statistics.eventsByCategory).map(([category, count]: [string, any]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="capitalize">{category}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statistics.topUsers.slice(0, 10).map((user: any, i: number) => (
              <div key={i} className="flex justify-between items-center">
                <span className="font-mono text-sm">{user.userId.substring(0, 12)}...</span>
                <Badge variant="outline">{user.eventCount}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuditTrail