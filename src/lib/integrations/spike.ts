import { prisma } from "@/lib/db";

interface Finding {
  severity: string;
  title: string;
  description?: string | null;
  resource: string;
  resourceType?: string | null;
  region?: string | null;
  recommendation?: string | null;
}

interface AlertOptions {
  userId: string;
  cloudProvider: "AWS" | "GCP" | "AZURE";
  accountName: string;
  finding: Finding;
}

/**
 * Map severity to Spike.sh priority levels
 */
function mapSeverityToPriority(severity: string): string {
  switch (severity.toUpperCase()) {
    case "CRITICAL":
      return "P1";
    case "HIGH":
      return "P2";
    case "MEDIUM":
      return "P3";
    case "LOW":
      return "P4";
    default:
      return "P3";
  }
}

/**
 * Send a finding alert to Spike.sh if enabled
 */
export async function sendSpikeAlert(options: AlertOptions): Promise<boolean> {
  const { userId, cloudProvider, accountName, finding } = options;

  try {
    // Get user settings
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Check if Spike.sh is enabled
    if (!settings?.spikeEnabled || !settings?.spikeWebhookUrl) {
      return false;
    }

    const severity = finding.severity.toUpperCase();

    // Check if we should alert for this severity
    if (severity === "CRITICAL" && !settings.spikeAlertOnCritical) {
      return false;
    }
    if (severity === "HIGH" && !settings.spikeAlertOnHigh) {
      return false;
    }
    // Skip MEDIUM and LOW by default
    if (severity !== "CRITICAL" && severity !== "HIGH") {
      return false;
    }

    // Construct the Spike.sh alert payload
    const spikePayload = {
      title: `[${cloudProvider}] ${severity}: ${finding.title}`,
      message: finding.description || finding.title,
      status: severity === "CRITICAL" ? "CRITICAL" : "WARNING",
      priority: mapSeverityToPriority(severity),
      source: "CloudGuard Security Dashboard",
      timestamp: new Date().toISOString(),
      metadata: {
        severity: finding.severity,
        cloudProvider,
        resource: finding.resource,
        resourceType: finding.resourceType,
        region: finding.region,
        accountName,
        recommendation: finding.recommendation,
      },
    };

    // Send alert to Spike.sh
    const response = await fetch(settings.spikeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(spikePayload),
    });

    if (!response.ok) {
      console.error("Spike.sh alert failed:", await response.text());
      return false;
    }

    console.log(`Spike.sh alert sent for ${severity} finding: ${finding.title}`);
    return true;
  } catch (error) {
    console.error("Error sending Spike.sh alert:", error);
    return false;
  }
}

/**
 * Send multiple finding alerts to Spike.sh
 * Groups by severity to avoid alert fatigue
 */
export async function sendBulkSpikeAlerts(
  userId: string,
  cloudProvider: "AWS" | "GCP" | "AZURE",
  accountName: string,
  findings: Finding[]
): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  // Filter to only critical and high findings
  const alertableFindings = findings.filter(
    (f) =>
      f.severity.toUpperCase() === "CRITICAL" ||
      f.severity.toUpperCase() === "HIGH"
  );

  for (const finding of alertableFindings) {
    const success = await sendSpikeAlert({
      userId,
      cloudProvider,
      accountName,
      finding,
    });

    if (success) {
      sent++;
    } else {
      skipped++;
    }

    // Add a small delay between alerts to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { sent, skipped };
}

/**
 * Send an audit summary alert to Spike.sh
 */
export async function sendAuditSummaryAlert(
  userId: string,
  cloudProvider: "AWS" | "GCP" | "AZURE",
  accountName: string,
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }
): Promise<boolean> {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings?.spikeEnabled || !settings?.spikeWebhookUrl) {
      return false;
    }

    // Only send summary if there are critical or high findings
    if (summary.critical === 0 && summary.high === 0) {
      return false;
    }

    const status = summary.critical > 0 ? "CRITICAL" : "WARNING";
    const priority = summary.critical > 0 ? "P1" : "P2";

    const spikePayload = {
      title: `[${cloudProvider}] Audit Complete - ${summary.critical} Critical, ${summary.high} High findings`,
      message: `Security audit completed for ${accountName}. Found ${summary.total} total findings: ${summary.critical} Critical, ${summary.high} High, ${summary.medium} Medium, ${summary.low} Low.`,
      status,
      priority,
      source: "CloudGuard Security Dashboard",
      timestamp: new Date().toISOString(),
      metadata: {
        cloudProvider,
        accountName,
        critical: summary.critical,
        high: summary.high,
        medium: summary.medium,
        low: summary.low,
        total: summary.total,
        type: "audit_summary",
      },
    };

    const response = await fetch(settings.spikeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(spikePayload),
    });

    if (!response.ok) {
      console.error("Spike.sh summary alert failed:", await response.text());
      return false;
    }

    console.log(`Spike.sh audit summary alert sent for ${accountName}`);
    return true;
  } catch (error) {
    console.error("Error sending Spike.sh summary alert:", error);
    return false;
  }
}
