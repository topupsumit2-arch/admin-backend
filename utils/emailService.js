const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const RESEND_HOST = process.env.RESEND_HOST || 'smtp.resend.com';
const RESEND_PORT = Number(process.env.RESEND_PORT || 587);
const RESEND_SECURE = RESEND_PORT === 465;
const RESEND_USERNAME = process.env.RESEND_USERNAME || 'resend';
const RESEND_PASSWORD = process.env.RESEND_PASSWORD || process.env.RESEND_API_KEY || '';

const transporter = nodemailer.createTransport({
  host: RESEND_HOST,
  port: RESEND_PORT,
  secure: RESEND_SECURE,
  auth: {
    user: RESEND_USERNAME,
    pass: RESEND_PASSWORD
  },
  requireTLS: true,
  tls: {
    rejectUnauthorized: false
  }
});

const hasResendCredentials = Boolean(RESEND_PASSWORD && RESEND_PASSWORD !== 'your_resend_api_key');

if (hasResendCredentials) {
  transporter.verify((error, success) => {
    if (error) {
      logger.error('Resend connection error:', error);
      logger.error(`Resend config check failed: host=${RESEND_HOST}, port=${RESEND_PORT}, secure=${RESEND_SECURE}`);
    } else {
      logger.info('Resend connection successful');
      logger.info(`Resend config: host=${RESEND_HOST}, port=${RESEND_PORT}, secure=${RESEND_SECURE}`);
    }
  });
} else {
  logger.warn('Resend SMTP credentials are not configured correctly. Add RESEND_API_KEY / RESEND_PASSWORD and restart the server.');
}

/**
 * Send email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise}
 */
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `${process.env.RESEND_FROM_NAME || 'Stay In Hostel'} <${process.env.RESEND_FROM_EMAIL || 'noreply@stayinhostel.com'}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}`, { messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email to multiple recipients
 * @param {array} recipients - Array of recipient emails
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise}
 */
const sendBulkEmail = async (recipients, subject, html) => {
  try {
    const results = await Promise.all(
      recipients.map(email => sendEmail(email, subject, html))
    );
    
    const successful = results.filter(r => r.success).length;
    logger.info(`Bulk email sent: ${successful}/${recipients.length} successful`);
    return { success: true, results };
  } catch (error) {
    logger.error('Bulk email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send email with template
 * @param {string} to - Recipient email
 * @param {object} template - Template object with subject and html
 * @returns {Promise}
 */
const sendTemplateEmail = async (to, template) => {
  return sendEmail(to, template.subject, template.html);
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  sendTemplateEmail,
  transporter
};
