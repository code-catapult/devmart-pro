import { Resend } from 'resend'
import nodemailer from 'nodemailer'

interface SendPasswordResetEmailParams {
  email: string
  resetToken: string
}

interface SendPasswordResetEmailParams {
  email: string
  resetToken: string
}

// Email HTML template
function getPasswordResetEmailHTML(resetUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Reset Your Password</h1>
          <p>You requested to reset your password for your DevMart Pro account.</p>
          <p>Click the button below to create a new password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this URL into your browser:<br>
            <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
          </p>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 1 hour.
          </p>
          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            DevMart Pro - Your trusted e-commerce platform
          </p>
        </div>
      </body>
    </html>
  `
}

// Email text template
function getPasswordResetEmailText(resetUrl: string) {
  return `
Reset Your Password

You requested to reset your password for your DevMart Pro account.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

DevMart Pro - Your trusted e-commerce platform
  `
}

// Send email using Resend (Production)
async function sendWithResend(email: string, resetUrl: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'DevMart <noreply@yourdomain.com>',
    to: email,
    subject: 'Reset Your Password - DevMart Pro',
    html: getPasswordResetEmailHTML(resetUrl),
  })

  if (error) {
    console.error('Error sending password reset email:', error)
    throw new Error('Failed to send password reset email')
  }

  console.log('📧 Password reset email sent via Resend:', data)
}

// Send email using Nodemailer + Ethereal (Development/Testing)
async function sendWithNodemailer(
  email: string,
  resetUrl: string
): Promise<void> {
  // Create Ethereal test account on-the-fly
  const testAccount = await nodemailer.createTestAccount()

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'DevMart <noreply@devmart.com>',
    to: email,
    subject: 'Reset Your Password - DevMart Pro',
    html: getPasswordResetEmailHTML(resetUrl),
    text: getPasswordResetEmailText(resetUrl),
  })

  console.log('📧 Password reset email sent (TEST MODE)')
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
  console.log('Reset URL: %s', resetUrl)
}

export async function sendPasswordResetEmail({
  email,
  resetToken,
}: SendPasswordResetEmailParams) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

  try {
    // Use Resend if API key is provided, otherwise use Nodemailer/Ethereal
    if (process.env.RESEND_API_KEY) {
      await sendWithResend(email, resetUrl)
    } else {
      await sendWithNodemailer(email, resetUrl)
    }
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}
