const { Resend } = require('resend');
const logger = require('../config/logger');

const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_PASSWORD || '';
const resend = new Resend(apiKey);

const hasResendCredentials = Boolean(apiKey && apiKey !== 'your_resend_api_key');

if (hasResendCredentials) {
  logger.info('Resend HTTP API client initialized successfully');
} else {
  logger.warn('Resend API key is not configured correctly. Add RESEND_API_KEY and restart the server.');
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
    if (!hasResendCredentials) {
      throw new Error('Resend API key is missing or invalid.');
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@stayinhostel.com';
    const fromName = process.env.RESEND_FROM_NAME || 'Stay In Hostel';
    
    // Format "Name <email@domain.com>" properly for Resend API
    const fromField = `${fromName} <${fromEmail}>`;

    const data = await resend.emails.send({
      from: fromField,
      to: [to],
      subject,
      html
    });

    logger.info(`Email sent successfully to ${to}`, { id: data.id || data.data?.id });
    return { success: true, messageId: data.id || data.data?.id };
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
  transporter: null // Kept as null for backwards compatibility in case other files reference it
};
