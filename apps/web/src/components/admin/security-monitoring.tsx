'use client'

import { useState } from 'react'
import { api } from '~/utils/api'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@repo/ui'

import {
  Shield,
  UserX,
  MapPin,
  Users,
  ShoppingCart,
  Eye,
  X,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
type AlertType =
  | 'FAILED_LOGIN'
  | 'UNUSUAL_LOCATION'
  | 'RAPID_ACCOUNT_CREATION'
  | 'HIGH_VALUE_NEW_ACCOUNT'
  | 'RAPID_ORDERS'

interface SecurityAlert {
  type: AlertType
  severity: AlertSeverity
  userId?: string
  userEmail?: string | null
  userName?: string | null
  ipAddress?: string
  orderId?: string
  userIds?: string[]
  count?: number
  orderValue?: number
  message: string
  evidence: Record<string, unknown>
  timestamp: Date
}

/**
 * SecurityMonitoring Component
 *
 * Real-time security threat detection dashboard.
 * Displays alerts from multiple detection algorithms with investigation workflow.
 *
 * Features:
 * - Real-time alert updates
 * - Severity-based color coding
 * - Alert type icons
 * - Investigation workflow (view user profile)
 * - Alert dismissal with reason
 * - Evidence display for forensics
 * - Mobile-optimized alert cards
 */
export function SecurityMonitoring() {
  const utils = api.useUtils()
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null)
  const [showDismissDialog, setShowDismissDialog] = useState(false)
  const [dismissReason, setDismissReason] = useState('')

  // Fetch security alerts
  const {
    data: alerts,
    isLoading,
    isFetching,
  } = api.admin.security.getSecurityAlerts.useQuery(undefined, {
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  const dismissAlert = api.admin.security.dismissSecurityAlert.useMutation({
    onSuccess: () => {
      setShowDismissDialog(false)
      setSelectedAlert(null)
      setDismissReason('')
      // Invalidate the query to refetch alerts from server
      void utils.admin.security.getSecurityAlerts.invalidate()
    },
  })

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getSeverityBadgeColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600 text-white'
      case 'HIGH':
        return 'bg-orange-600 text-white'
      case 'MEDIUM':
        return 'bg-yellow-600 text-white'
      case 'LOW':
        return 'bg-blue-600 text-white'
    }
  }

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'FAILED_LOGIN':
        return <UserX className="h-5 w-5" />
      case 'UNUSUAL_LOCATION':
        return <MapPin className="h-5 w-5" />
      case 'RAPID_ACCOUNT_CREATION':
        return <Users className="h-5 w-5" />
      case 'HIGH_VALUE_NEW_ACCOUNT':
      case 'RAPID_ORDERS':
        return <ShoppingCart className="h-5 w-5" />
    }
  }

  const getAlertTitle = (type: AlertType) => {
    switch (type) {
      case 'FAILED_LOGIN':
        return 'Failed Login Attempts'
      case 'UNUSUAL_LOCATION':
        return 'Unusual Login Location'
      case 'RAPID_ACCOUNT_CREATION':
        return 'Rapid Account Creation'
      case 'HIGH_VALUE_NEW_ACCOUNT':
        return 'High-Value Order (New Account)'
      case 'RAPID_ORDERS':
        return 'Rapid Orders (Card Testing)'
    }
  }

  const handleDismiss = () => {
    if (!selectedAlert) return

    dismissAlert.mutate({
      alertType: selectedAlert.type,
      userId: selectedAlert.userId,
      ipAddress: selectedAlert.ipAddress,
      reason: dismissReason,
    })
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 md:h-8 md:w-8 text-blue-600" />
            Security Monitoring
          </h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Real-time threat detection and suspicious activity alerts
          </p>
        </div>
        <Button
          onClick={() =>
            void utils.admin.security.getSecurityAlerts.invalidate()
          }
          variant="outline"
          size="sm"
          disabled={isFetching}
          className="w-full sm:w-auto min-h-[44px]"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
          />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-red-600">
                {alerts?.filter((a) => a.severity === 'CRITICAL').length || 0}
              </div>
              <div className="text-xs md:text-sm text-gray-600 mt-1">
                Critical
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-orange-600">
                {alerts?.filter((a) => a.severity === 'HIGH').length || 0}
              </div>
              <div className="text-xs md:text-sm text-gray-600 mt-1">High</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-yellow-600">
                {alerts?.filter((a) => a.severity === 'MEDIUM').length || 0}
              </div>
              <div className="text-xs md:text-sm text-gray-600 mt-1">
                Medium
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-gray-600">
                {alerts?.length || 0}
              </div>
              <div className="text-xs md:text-sm text-gray-600 mt-1">Total</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              Loading security alerts...
            </div>
          </CardContent>
        </Card>
      ) : alerts && alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert, index) => (
            <Card
              key={index}
              className={`border-l-4 ${getSeverityColor(alert.severity)}`}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base md:text-lg flex flex-wrap items-center gap-2">
                        {getAlertTitle(alert.type)}
                        <Badge
                          className={getSeverityBadgeColor(alert.severity)}
                        >
                          {alert.severity}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {alert.message}
                      </p>
                      {'userEmail' in alert && alert.userEmail && (
                        <p className="text-xs text-gray-500 mt-1">
                          User: {alert.userName || alert.userEmail}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {'userId' in alert && alert.userId && (
                      <Link href={`/admin/users/${alert.userId}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none min-h-[44px]"
                        >
                          <Eye className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Investigate</span>
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAlert(alert)
                        setShowDismissDialog(true)
                      }}
                      className="flex-1 sm:flex-none min-h-[44px]"
                    >
                      <X className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Dismiss</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <div className="text-xs font-medium text-gray-700">
                    Evidence:
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {Object.entries(alert.evidence).map(([key, value]) => (
                      <div key={key} className="flex flex-wrap gap-1">
                        <span className="font-medium">{key}:</span>
                        <span>
                          {Array.isArray(value)
                            ? value.join(', ')
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Detected: {format(new Date(alert.timestamp), 'PPpp')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">
                No Security Threats Detected
              </p>
              <p className="text-sm text-gray-600 mt-1">
                All systems normal. Monitoring continues automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dismiss Alert Dialog */}
      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Dismiss Security Alert</DialogTitle>
            <DialogDescription>
              Provide a reason for dismissing this alert. This will be logged
              for audit purposes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dismiss-reason">Reason for Dismissal</Label>
              <Textarea
                id="dismiss-reason"
                placeholder="e.g., False positive - user confirmed legitimate travel, Investigated - no threat found, etc."
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDismissDialog(false)
                setSelectedAlert(null)
                setDismissReason('')
              }}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDismiss}
              disabled={!dismissReason.trim() || dismissAlert.isPending}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {dismissAlert.isPending ? 'Dismissing...' : 'Dismiss Alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
