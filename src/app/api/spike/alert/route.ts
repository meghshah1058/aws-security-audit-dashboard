import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface AlertPayload {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description?: string;
  resource: string;
  resourceType?: string;
  region?: string;
  recommendation?: string;
  cloudProvider: "AWS" | "GCP" | "AZURE";
  accountName?: string;
}

// Map severity to Spike.sh priority
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

// POST - Send alert to Spike.sh
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { settings: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const settings = user.settings;

    // Check if Spike.sh is enabled
    if (!settings?.spikeEnabled || !settings?.spikeWebhookUrl) {
      return NextResponse.json(
        { error: "Spike.sh integration is not enabled" },
        { status: 400 }
      );
    }

    const payload: AlertPayload = await request.json();

    // Check if we should alert for this severity
    const severity = payload.severity.toUpperCase();
    if (severity === "CRITICAL" && !settings.spikeAlertOnCritical) {
      return NextResponse.json(
        { message: "Alert skipped - Critical alerts are disabled" },
        { status: 200 }
      );
    }
    if (severity === "HIGH" && !settings.spikeAlertOnHigh) {
      return NextResponse.json(
        { message: "Alert skipped - High alerts are disabled" },
        { status: 200 }
      );
    }
    // Skip MEDIUM and LOW by default unless explicitly configured
    if (severity === "MEDIUM" || severity === "LOW") {
      return NextResponse.json(
        { message: `Alert skipped - ${severity} alerts are not enabled` },
        { status: 200 }
      );
    }

    // Construct the Spike.sh alert payload
    const spikePayload = {
      title: `[${payload.cloudProvider}] ${payload.severity}: ${payload.title}`,
      message: payload.description || payload.title,
      status: severity === "CRITICAL" ? "CRITICAL" : "WARNING",
      priority: mapSeverityToPriority(payload.severity),
      source: "CloudGuard Security Dashboard",
      timestamp: new Date().toISOString(),
      metadata: {
        severity: payload.severity,
        cloudProvider: payload.cloudProvider,
        resource: payload.resource,
        resourceType: payload.resourceType,
        region: payload.region,
        accountName: payload.accountName,
        recommendation: payload.recommendation,
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
      const errorText = await response.text();
      console.error("Spike.sh alert failed:", errorText);
      return NextResponse.json(
        { error: "Failed to send alert to Spike.sh" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Alert sent to Spike.sh successfully",
    });
  } catch (error) {
    console.error("Spike alert API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
