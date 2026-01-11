import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET user settings
export async function GET() {
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

    // Return settings or defaults
    const settings = user.settings || {
      spikeWebhookUrl: "",
      spikeEnabled: false,
      spikeAlertOnCritical: true,
      spikeAlertOnHigh: false,
      slackWebhookUrl: "",
      slackEnabled: false,
      emailAlerts: true,
      alertThreshold: "CRITICAL",
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST/UPDATE user settings
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

    const body = await request.json();
    const {
      spikeWebhookUrl,
      spikeEnabled,
      spikeAlertOnCritical,
      spikeAlertOnHigh,
      slackWebhookUrl,
      slackEnabled,
      emailAlerts,
      alertThreshold,
    } = body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        spikeWebhookUrl: spikeWebhookUrl ?? undefined,
        spikeEnabled: spikeEnabled ?? undefined,
        spikeAlertOnCritical: spikeAlertOnCritical ?? undefined,
        spikeAlertOnHigh: spikeAlertOnHigh ?? undefined,
        slackWebhookUrl: slackWebhookUrl ?? undefined,
        slackEnabled: slackEnabled ?? undefined,
        emailAlerts: emailAlerts ?? undefined,
        alertThreshold: alertThreshold ?? undefined,
      },
      create: {
        userId: user.id,
        spikeWebhookUrl: spikeWebhookUrl || null,
        spikeEnabled: spikeEnabled || false,
        spikeAlertOnCritical: spikeAlertOnCritical ?? true,
        spikeAlertOnHigh: spikeAlertOnHigh || false,
        slackWebhookUrl: slackWebhookUrl || null,
        slackEnabled: slackEnabled || false,
        emailAlerts: emailAlerts ?? true,
        alertThreshold: alertThreshold || "CRITICAL",
      },
    });

    return NextResponse.json({ settings, message: "Settings saved successfully" });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
