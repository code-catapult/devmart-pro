import { auditLogService } from '../services/AuditLogService'

/**
 * Archive Activity Logs Job
 *
 * Runs daily to move logs older than 90 days to archived state
 * In production, would export to S3/cloud storage before archiving
 *
 * Uses AuditLogService.archiveOldLogs() which handles the archival logic
 */
export async function archiveActivityLogs() {
  console.log('[Archive Job] Starting archive for activity logs')

  try {
    // Use the existing service method to archive logs older than 90 days
    // In production, you could export to S3 before archiving:
    // await exportToS3(logsToArchive);
    const archivedCount = await auditLogService.archiveOldLogs(90)

    if (archivedCount === 0) {
      console.log('[Archive Job] No logs to archive')
      return 0
    }

    console.log(`[Archive Job] Successfully archived ${archivedCount} logs`)
    return archivedCount
  } catch (error) {
    console.error('[Archive Job] Failed to archive logs:', error)
    throw error
  }
}

// Schedule with cron (if using node-cron or similar)
// cron.schedule('0 2 * * *', archiveActivityLogs); // Runs at 2 AM daily
