interface EmailTemplate {
  subject: string
  html: string
  text: string
}

interface RoleChangeEmailData {
  userName: string
  newRole: string
  adminName: string
}

interface SuspensionEmailData {
  userName: string
  reason: string
  notes?: string
  supportEmail: string
}

interface ActivationEmailData {
  userName: string
}

interface SuspiciousActivityEmailData {
  userName: string
  activityType: string
  timestamp: string
  ipAddress: string
  location?: string
}

/**
 * Email Templates for Account Notifications
 *
 * All templates are mobile-responsive and use inline CSS
 * for maximum email client compatibility.
 */
export const emailTemplates = {
  /**
   * Role Change Notification
   */
  roleChange: (data: RoleChangeEmailData): EmailTemplate => ({
    subject: `Your DevMart account role has been changed`,

    text: `Hi ${data.userName},

Your account role has been changed to ${data.newRole} by admin ${
      data.adminName
    }.

${
  data.newRole === 'ADMIN'
    ? 'You now have administrative access to the platform. Please review admin guidelines at https://devmart.com/admin/help'
    : 'Your account has been changed to a standard user role.'
}

If you have any questions, please contact our support team.

Best regards,
DevMart Team`,

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">DevMart</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; color: #333;">Account Role Changed</h2>

              <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6; color: #555;">
                Hi <strong>${data.userName}</strong>,
              </p>

              <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6; color: #555;">
                Your account role has been updated to <strong style="color: #667eea;">${
                  data.newRole
                }</strong> by admin ${data.adminName}.
              </p>

              ${
                data.newRole === 'ADMIN'
                  ? `
              <div style="margin: 30px 0; padding: 20px; background-color: #f0f4ff; border-left: 4px solid #667eea; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #555;">
                  <strong>New Admin Access</strong><br>
                  You now have administrative access to manage users, orders, and platform settings.
                </p>
              </div>

              <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="background-color: #667eea; border-radius: 6px;">
                    <a href="https://devmart.com/admin"
                       style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Go to Admin Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              `
                  : ''
              }

              <p style="margin: 20px 0 0; font-size: 14px; color: #999;">
                If you didn't expect this change, please contact our support team immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                DevMart, Inc. | 123 Main St, San Francisco, CA 94105<br>
                <a href="https://devmart.com/support" style="color: #667eea; text-decoration: none;">Contact Support</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }),

  /**
   * Account Suspension Notification
   */
  accountSuspended: (data: SuspensionEmailData): EmailTemplate => ({
    subject: `Your DevMart account has been suspended`,

    text: `Hi ${data.userName},

Your account has been suspended.

Reason: ${data.reason}
${data.notes ? `\nAdditional Details: ${data.notes}` : ''}

To resolve this issue or appeal this decision, please contact our support team at ${
      data.supportEmail
    }.

Best regards,
DevMart Team`,

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px; background-color: #dc2626; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Account Suspended</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6; color: #555;">
                Hi <strong>${data.userName}</strong>,
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #555;">
                Your DevMart account has been suspended.
              </p>

              <div style="margin: 20px 0; padding: 20px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #555;">
                  <strong>Reason:</strong> ${data.reason}
                </p>
                ${
                  data.notes
                    ? `
                <p style="margin: 0; font-size: 14px; color: #555;">
                  <strong>Details:</strong> ${data.notes}
                </p>
                `
                    : ''
                }
              </div>

              <p style="margin: 20px 0; font-size: 16px; line-height: 1.6; color: #555;">
                You will not be able to log in until this issue is resolved.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="background-color: #dc2626; border-radius: 6px;">
                    <a href="mailto:${data.supportEmail}"
                       style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Contact Support
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 14px; color: #999;">
                If you believe this is an error, please reach out to our support team immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                DevMart, Inc. | 123 Main St, San Francisco, CA 94105<br>
                <a href="mailto:${
                  data.supportEmail
                }" style="color: #dc2626; text-decoration: none;">${
                  data.supportEmail
                }</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }),

  /**
   * Account Reactivation Notification
   */
  accountActivated: (data: ActivationEmailData): EmailTemplate => ({
    subject: `Your DevMart account has been reactivated`,

    text: `Hi ${data.userName},

Good news! Your account has been reactivated.

You can now log in and access all platform features.

Best regards,
DevMart Team`,

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px; background-color: #10b981; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">✓ Account Reactivated</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6; color: #555;">
                Hi <strong>${data.userName}</strong>,
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #555;">
                Great news! Your DevMart account has been reactivated.
              </p>

              <div style="margin: 20px 0; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #555;">
                  You now have full access to your account and can log in immediately.
                </p>
              </div>

              <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="background-color: #10b981; border-radius: 6px;">
                    <a href="https://devmart.com/login"
                       style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Log In to Your Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 14px; color: #999;">
                If you have any questions, our support team is here to help.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                DevMart, Inc. | 123 Main St, San Francisco, CA 94105<br>
                <a href="https://devmart.com/support" style="color: #10b981; text-decoration: none;">Contact Support</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }),

  /**
   * Suspicious Activity Alert
   */
  suspiciousActivity: (data: SuspiciousActivityEmailData): EmailTemplate => ({
    subject: `🚨 Security Alert: Suspicious activity detected on your DevMart account`,

    text: `SECURITY ALERT

Hi ${data.userName},

We detected suspicious activity on your account:

Activity Type: ${data.activityType}
Time: ${data.timestamp}
IP Address: ${data.ipAddress}
${data.location ? `Location: ${data.location}` : ''}

If this was you, you can safely ignore this message.

If you don't recognize this activity:
1. Change your password immediately
2. Review your account for unauthorized changes
3. Contact our support team

Secure your account: https://devmart.com/security

Best regards,
DevMart Security Team`,

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 3px solid #f59e0b;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 30px; background-color: #f59e0b; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🚨 Security Alert</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6; color: #555;">
                Hi <strong>${data.userName}</strong>,
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #555;">
                We detected <strong>suspicious activity</strong> on your DevMart account:
              </p>

              <div style="margin: 20px 0; padding: 20px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0 0 10px; font-size: 14px; color: #555;">
                  <strong>Activity Type:</strong> ${data.activityType}
                </p>
                <p style="margin: 0 0 10px; font-size: 14px; color: #555;">
                  <strong>Time:</strong> ${data.timestamp}
                </p>
                <p style="margin: 0 0 10px; font-size: 14px; color: #555;">
                  <strong>IP Address:</strong> ${data.ipAddress}
                </p>
                ${
                  data.location
                    ? `
                <p style="margin: 0; font-size: 14px; color: #555;">
                  <strong>Location:</strong> ${data.location}
                </p>
                `
                    : ''
                }
              </div>

              <div style="margin: 30px 0; padding: 20px; background-color: #fef2f2; border-radius: 6px;">
                <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #dc2626;">
                  If you don't recognize this activity:
                </p>
                <ol style="margin: 10px 0 0; padding-left: 20px; font-size: 14px; color: #555;">
                  <li style="margin-bottom: 8px;">Change your password immediately</li>
                  <li style="margin-bottom: 8px;">Review your account for unauthorized changes</li>
                  <li>Contact our support team</li>
                </ol>
              </div>

              <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="background-color: #dc2626; border-radius: 6px;">
                    <a href="https://devmart.com/security"
                       style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      Secure My Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 14px; color: #999;">
                If this was you, you can safely ignore this message.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                DevMart Security Team | This is an automated security alert<br>
                <a href="https://devmart.com/security/help" style="color: #f59e0b; text-decoration: none;">Learn more about account security</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }),
}
