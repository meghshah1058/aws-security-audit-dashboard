import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendAuditSummaryAlert, sendBulkSpikeAlerts } from "@/lib/integrations";

interface AuditAlertRequest {
  auditId: string;
  cloudProvider: "AWS" | "GCP" | "AZURE";
  sendIndividualAlerts?: boolean; // If true, sends alert for each finding
}

// POST - Send alerts for an audit to Spike.sh
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { auditId, cloudProvider, sendIndividualAlerts = false }: AuditAlertRequest = await request.json();

    if (!auditId || !cloudProvider) {
      return NextResponse.json(
        { error: "auditId and cloudProvider are required" },
        { status: 400 }
      );
    }

    // Fetch audit data based on cloud provider
    let audit;
    let accountName = "";
    let findings: Array<{
      severity: string;
      title: string;
      description: string | null;
      resource: string;
      resourceType: string | null;
      region: string | null;
      recommendation: string | null;
    }> = [];

    if (cloudProvider === "AWS") {
      audit = await prisma.awsAudit.findFirst({
        where: {
          id: auditId,
          account: { userId: user.id },
        },
        include: {
          account: true,
          findings: {
            where: {
              severity: { in: ["CRITICAL", "HIGH"] },
            },
          },
        },
      });
      if (audit) {
        accountName = audit.account.name;
        findings = audit.findings;
      }
    } else if (cloudProvider === "GCP") {
      audit = await prisma.gcpAudit.findFirst({
        where: {
          id: auditId,
          project: { userId: user.id },
        },
        include: {
          project: true,
          findings: {
            where: {
              severity: { in: ["CRITICAL", "HIGH"] },
            },
          },
        },
      });
      if (audit) {
        accountName = audit.project.name;
        findings = audit.findings;
      }
    } else if (cloudProvider === "AZURE") {
      audit = await prisma.azureAudit.findFirst({
        where: {
          id: auditId,
          subscription: { userId: user.id },
        },
        include: {
          subscription: true,
          findings: {
            where: {
              severity: { in: ["CRITICAL", "HIGH"] },
            },
          },
        },
      });
      if (audit) {
        accountName = audit.subscription.name;
        findings = audit.findings;
      }
    }

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    // Send summary alert
    const summaryResult = await sendAuditSummaryAlert(user.id, cloudProvider, accountName, {
      critical: audit.critical,
      high: audit.high,
      medium: audit.medium,
      low: audit.low,
      total: audit.totalFindings,
    });

    let individualResults = { sent: 0, skipped: 0 };

    // Optionally send individual alerts for each finding
    if (sendIndividualAlerts && findings.length > 0) {
      individualResults = await sendBulkSpikeAlerts(
        user.id,
        cloudProvider,
        accountName,
        findings
      );
    }

    return NextResponse.json({
      success: true,
      summaryAlertSent: summaryResult,
      individualAlerts: individualResults,
      message: `Alerts processed for ${accountName}`,
    });
  } catch (error) {
    console.error("Spike audit alert API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
