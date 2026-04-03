// api/send-welcome-email.js
// Sends welcome email after successful payment

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const PLAN_EMAILS = {
  starter: {
    title: 'Welcome to Fiesta Starter Plan!',
    benefits: [
      'Up to 3 chatbots',
      '10 FAQ documents',
      '10,000 API calls/month',
      '50,000 TTS characters/month',
      '5GB storage',
      'Basic analytics',
    ],
    nextSteps: [
      'Create your first chatbot',
      'Configure your chatbot widget',
      'Set up integrations',
      'Monitor analytics dashboard',
    ],
  },
  professional: {
    title: 'Welcome to Fiesta Professional Plan!',
    benefits: [
      'Up to 10 chatbots',
      '50 FAQ documents',
      '100,000 API calls/month',
      '500,000 TTS characters/month',
      '50GB storage',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
    ],
    nextSteps: [
      'Create multiple chatbots',
      'Setup integrations (Slack, Webhooks)',
      'Configure custom branding',
      'Access priority support',
    ],
  },
  enterprise: {
    title: 'Welcome to Fiesta Enterprise Plan!',
    benefits: [
      'Unlimited chatbots',
      'Unlimited FAQ documents',
      'Unlimited API calls',
      'Unlimited TTS characters',
      '500GB storage',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
      'Custom domain',
    ],
    nextSteps: [
      'Contact support for onboarding',
      'Setup custom domain',
      'Configure advanced integrations',
      'Schedule strategy call with team',
    ],
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userEmail, userName, planId, orderId } = req.body;

    if (!userEmail || !planId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const planInfo = PLAN_EMAILS[planId] || PLAN_EMAILS.starter;

    // Create HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .section { margin: 20px 0; }
            .section h2 { color: #667eea; font-size: 18px; }
            .benefits { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .benefits li { margin: 8px 0; }
            .cta { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${planInfo.title}</h1>
              <p>Thank you for your subscription! 🎉</p>
            </div>
            
            <div class="content">
              <p>Hi ${userName || 'there'},</p>
              <p>Your payment has been successfully processed. Your ${planId} plan is now active and ready to use!</p>
              
              <div class="section">
                <h2>Your Plan Includes:</h2>
                <div class="benefits">
                  <ul>
                    ${planInfo.benefits.map(benefit => `<li>✓ ${benefit}</li>`).join('')}
                  </ul>
                </div>
              </div>

              <div class="section">
                <h2>Getting Started:</h2>
                <ol>
                  ${planInfo.nextSteps.map(step => `<li>${step}</li>`).join('')}
                </ol>
              </div>

              <div class="section">
                <p><strong>Order ID:</strong> ${orderId}</p>
                <a href="${process.env.APP_URL || 'http://localhost:5173'}/dashboard" class="cta">Go to Dashboard</a>
              </div>

              <div class="section">
                <h3>Need Help?</h3>
                <p>We're here to help! Check out our documentation or reach out to support at support@fiesta.ai</p>
              </div>
            </div>

            <div class="footer">
              <p>© 2026 Fiesta. All rights reserved.</p>
              <p><a href="https://fiesta.ai/privacy">Privacy Policy</a> | <a href="https://fiesta.ai/terms">Terms of Service</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from: `Fiesta <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: `${planInfo.title} - Welcome to Fiesta!`,
      html: htmlContent,
    });

    console.log(`Welcome email sent to ${userEmail}`);
    return res.status(200).json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({ error: error.message });
  }
}
