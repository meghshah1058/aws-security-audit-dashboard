import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST - Test Spike.sh webhook
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { webhookUrl } = await request.json();

    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook URL is required" }, { status: 400 });
    }

    // Send test alert to Spike.sh
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "CloudGuard Test Alert",
        message: "This is a test alert from CloudGuard Security Dashboard. If you see this, your Spike.sh integration is working correctly!",
        status: "INFO",
        priority: "LOW",
        source: "CloudGuard Security Dashboard",
        timestamp: new Date().toISOString(),
        metadata: {
          type: "test",
          user: session.user.email,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Spike.sh test webhook failed:", errorText);
      return NextResponse.json(
        { error: "Failed to send test alert to Spike.sh" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Test alert sent successfully" });
  } catch (error) {
    console.error("Spike test API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
