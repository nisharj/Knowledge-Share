import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_WEBSITE_URL = process.env.CLIENT_URL || "http://localhost:5173";
const DEFAULT_SUPPORT_EMAIL =
  process.env.ADMIN_EMAIL || "support@knowledgehub.com";
let cachedTransporter;

// Initialize email transporter
const createTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const emailService = process.env.EMAIL_SERVICE || "gmail";
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    console.warn(
      "Email credentials not configured. Email notifications will be skipped.",
    );
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    service: emailService,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  return cachedTransporter;
};

// Read and compile email template
const getEmailTemplate = (data) => {
  const templatePath = path.join(
    __dirname,
    "../templates/newResourceEmail.html",
  );

  try {
    let html = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders with actual data
    html = html
      .replace(/{{userName}}/g, data.userName || "Learner")
      .replace(/{{resourceTitle}}/g, data.resourceTitle || "")
      .replace(/{{resourceType}}/g, data.resourceType || "")
      .replace(/{{resourceCategory}}/g, data.resourceCategory || "General")
      .replace(/{{resourceDescription}}/g, data.resourceDescription || "");

    // Handle tags
    if (data.resourceTags && data.resourceTags.length > 0) {
      const tagsHtml = data.resourceTags
        .map((tag) => `<span class="tag">${tag}</span>`)
        .join("");
      html = html.replace(
        /{{#if resourceTags}}[\s\S]*?{{\/if}}/,
        `
        <div class="resource-tags">
          <strong>Tags:</strong><br>
          ${tagsHtml}
        </div>
        `,
      );
    } else {
      html = html.replace(/{{#if resourceTags}}[\s\S]*?{{\/if}}/g, "");
    }

    html = html
      .replace(/{{resourceLink}}/g, data.resourceLink || "#")
      .replace(/{{dashboardLink}}/g, data.dashboardLink || "#")
      .replace(/{{websiteUrl}}/g, data.websiteUrl || "#")
      .replace(/{{contactEmail}}/g, `mailto:${data.contactEmail || ""}`)
      .replace(/{{#each resourceTags}}[\s\S]*?{{\/each}}/g, "");

    return html;
  } catch (error) {
    console.error("Error reading email template:", error.message);
    return null;
  }
};

const getNotificationEnabledTemplate = ({ userName, websiteUrl }) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Notifications Enabled</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:18px;padding:40px 32px;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
        <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
          Knowledge Hub
        </div>
        <h1 style="margin:24px 0 12px;font-size:30px;line-height:1.2;color:#111827;">
          Notifications are enabled
        </h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
          Hi ${userName},
        </p>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
          Your account is ready, and email notifications are enabled on our website.
          We will let you know when new learning resources are added.
        </p>
        <p style="margin:0 0 28px;font-size:16px;line-height:1.7;">
          You can visit your dashboard anytime to explore the latest content.
        </p>
        <a
          href="${websiteUrl}"
          style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:700;"
        >
          Open Knowledge Hub
        </a>
        <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">
          If you have any questions, reply to this email and our team will help.
        </p>
      </div>
    </div>
  </body>
</html>
`;

const buildMailFrom = () => `"Knowledge Hub Team" <${process.env.EMAIL_USER}>`;

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeSafeLink = (value) => {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmed);
    return ["http:", "https:"].includes(parsedUrl.protocol) ? trimmed : "";
  } catch (_error) {
    return "";
  }
};

// Send email notification to a user
export const sendResourceNotificationEmail = async (
  user,
  resource,
  websiteUrl,
  transporter = createTransporter(),
) => {
  if (!transporter) {
    console.log(
      "Email service not configured. Skipping notification for user:",
      user.email,
    );
    return false;
  }

  try {
    const emailData = {
      userName: user.name.split(" ")[0] || "Learner",
      resourceTitle: resource.title,
      resourceType:
        resource.type.charAt(0).toUpperCase() + resource.type.slice(1),
      resourceCategory:
        resource.category.charAt(0).toUpperCase() + resource.category.slice(1),
      resourceDescription: resource.description,
      resourceTags: resource.tags || [],
      resourceLink: resource.link,
      dashboardLink: websiteUrl || DEFAULT_WEBSITE_URL,
      websiteUrl: websiteUrl || DEFAULT_WEBSITE_URL,
      contactEmail: DEFAULT_SUPPORT_EMAIL,
    };

    const htmlContent = getEmailTemplate(emailData);

    if (!htmlContent) {
      console.error("Failed to generate email template");
      return false;
    }

    const mailOptions = {
      from: buildMailFrom(),
      to: user.email,
      subject: `New Resource: ${resource.title}`,
      html: htmlContent,
      headers: {
        "X-Priority": "3",
        "X-Mailer": "Knowledge Hub Notification System",
      },
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error(
      "Error sending email to",
      user.email,
      ":",
      error.code || "UNKNOWN",
      error.message,
    );
    return false;
  }
};

export const sendNotificationEnabledEmail = async (user, websiteUrl) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(
      "Email service not configured. Skipping notification-enabled email for user:",
      user.email,
    );
    return false;
  }

  try {
    const firstName = String(user.name || "Learner").trim().split(" ")[0];
    const htmlContent = getNotificationEnabledTemplate({
      userName: firstName || "Learner",
      websiteUrl: websiteUrl || DEFAULT_WEBSITE_URL,
    });

    const info = await transporter.sendMail({
      from: buildMailFrom(),
      to: user.email,
      subject: "Notifications are enabled on Knowledge Hub",
      html: htmlContent,
      headers: {
        "X-Priority": "3",
        "X-Mailer": "Knowledge Hub Notification System",
      },
    });

    console.log(
      "Notification-enabled email sent successfully:",
      info.messageId,
    );
    return true;
  } catch (error) {
    console.error(
      "Error sending notification-enabled email to",
      user.email,
      ":",
      error.code || "UNKNOWN",
      error.message,
    );
    return false;
  }
};

export const sendChatbotSubmissionEmail = async ({
  name,
  topic,
  message,
  link,
  email,
  currentPath,
}) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(
      "Email service not configured. Skipping chatbot submission email.",
    );
    return false;
  }

  try {
    const websiteUrl = process.env.CLIENT_URL || DEFAULT_WEBSITE_URL;
    const subjectTopic = String(topic || "Website feedback").trim();
    const senderEmail = String(email || "").trim();
    const safeLink = normalizeSafeLink(link);
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Chatbot submission</title>
        </head>
        <body style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,sans-serif;color:#111827;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ef;border-radius:18px;padding:28px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">
              Knowledge Hub chatbot
            </p>
            <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2;">
              New chatbot submission
            </h1>
            <p style="margin:0 0 12px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p style="margin:0 0 12px;"><strong>Topic:</strong> ${escapeHtml(subjectTopic)}</p>
            <p style="margin:0 0 12px;"><strong>Email:</strong> ${escapeHtml(senderEmail || "Not provided")}</p>
            <p style="margin:0 0 12px;"><strong>Reference link:</strong> ${safeLink ? `<a href="${escapeHtml(safeLink)}" style="color:#2563eb;">${escapeHtml(safeLink)}</a>` : "Not provided"}</p>
            <p style="margin:0 0 12px;"><strong>Page:</strong> ${escapeHtml(currentPath || "/")}</p>
            <div style="margin-top:20px;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-weight:700;">Message</p>
              <p style="margin:0;white-space:pre-wrap;line-height:1.7;">${escapeHtml(message)}</p>
            </div>
            <p style="margin:20px 0 0;font-size:14px;color:#6b7280;">
              Submitted from ${escapeHtml(websiteUrl)}.
            </p>
          </div>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: buildMailFrom(),
      to: process.env.ADMIN_EMAIL || DEFAULT_SUPPORT_EMAIL,
      replyTo: senderEmail || undefined,
      subject: `[Chatbot] ${subjectTopic}`,
      html,
      headers: {
        "X-Mailer": "Knowledge Hub Chatbot",
      },
    });

    console.log("Chatbot submission email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error(
      "Error sending chatbot submission email:",
      error.code || "UNKNOWN",
      error.message,
    );
    return false;
  }
};

// Send batch emails to multiple users
export const sendBatchResourceNotifications = async (
  users,
  resource,
  websiteUrl,
) => {
  if (!users || users.length === 0) {
    console.log("No users to notify");
    return { success: 0, failed: 0 };
  }

  console.log(`Sending email notifications to ${users.length} users...`);

  let successCount = 0;
  let failedCount = 0;
  const transporter = createTransporter();

  if (!transporter) {
    return { success: 0, failed: users.length };
  }

  // Send emails sequentially to avoid overwhelming the email service
  for (const user of users) {
    const sent = await sendResourceNotificationEmail(
      user,
      resource,
      websiteUrl,
      transporter,
    );
    if (sent) {
      successCount++;
    } else {
      failedCount++;
    }

    // Add a small delay between emails to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(
    `Email notifications sent: ${successCount} successful, ${failedCount} failed`,
  );

  return { success: successCount, failed: failedCount };
};
