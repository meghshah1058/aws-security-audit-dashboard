"use client";

import { useEffect, useState } from "react";
import {
  SeverityStatsRow,
  ActivityFeed,
  PhaseSummary,
  SecurityScore,
  QuickActions,
  GlassCard,
} from "@/components/dashboard";
import {
  FindingsTrendChart,
  SeverityDistributionChart,
} from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Sparkles, AlertTriangle, ArrowRight, RefreshCw, Cloud } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  stats: {
    totalFindings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    riskScore: number;
    projectName: string;
    lastScanAt: string | null;
  };
  phases: Array<{
    id: string;
    phaseNumber: number;
    name: string;
    status: string;
    findings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  findings: Array<{
    id: string;
    findingId: string;
    severity: string;
    title: string;
    description?: string;
    resource: string;
    resourcePath?: string;
    region?: string;
    recommendation?: string;
    status: string;
  }>;
  historicalAudits: Array<{
    id: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    completedAt: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    projectId: string;
  }>;
}

export default function GcpDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/gcp/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const criticalFindings = data?.findings.filter(f => f.severity === "CRITICAL") || [];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 bg-white/10" />
            <Skeleton className="h-4 w-64 mt-2 bg-white/10" />
          </div>
          <Skeleton className="h-10 w-32 bg-white/10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-white/10 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Failed to load dashboard</h2>
        <p className="text-white/50 mb-4">{error}</p>
        <Button onClick={fetchDashboardData} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // Empty state - no GCP projects added
  if (!data?.projects || data.projects.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Cloud className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">GCP Security Dashboard</h1>
            <p className="text-white/50 mt-1">Connect your GCP project to get started</p>
          </div>
        </div>

        <GlassCard className="p-12">
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-6">
              <Cloud className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              No GCP Projects Connected
            </h2>
            <p className="text-white/50 mb-6 leading-relaxed">
              Add your Google Cloud Platform project to run comprehensive security audits with 25 phases and 248+ automated checks covering IAM, Cloud Storage, VPC, GKE, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/dashboard/gcp/projects">
                <Button className="btn-gradient gap-2">
                  <Sparkles className="w-4 h-4" />
                  Add GCP Project
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="gap-2 bg-white/5 border-white/10">
                  Learn More
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="mt-8 pt-6 border-t border-white/10 w-full">
              <p className="text-sm text-white/40 mb-3">What you&apos;ll get:</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-white/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  IAM & Identity Audit
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Cloud Storage Security
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  VPC Network Analysis
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  GKE Cluster Security
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  const severityData = {
    critical: data?.stats.critical || 0,
    high: data?.stats.high || 0,
    medium: data?.stats.medium || 0,
    low: data?.stats.low || 0,
    total: data?.stats.totalFindings || 0,
    changes: {
      critical: "from last scan",
      high: "from last scan",
      medium: "from last scan",
      low: "from last scan",
      total: "from last scan",
    },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Cloud className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">GCP Security Dashboard</h1>
            <p className="text-white/50 mt-1">
              {data?.stats.projectName ? (
                <>Project: <span className="text-blue-400">{data.stats.projectName}</span></>
              ) : (
                "Overview of your GCP security posture"
              )}
            </p>
          </div>
        </div>
        <Button className="btn-gradient gap-2">
          <Play className="w-4 h-4" />
          Run Full Audit
        </Button>
      </div>

      {/* Stats Cards Row */}
      <SeverityStatsRow {...severityData} linkPrefix="/dashboard/gcp/findings" />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FindingsTrendChart data={data?.historicalAudits} />
        </div>
        <div>
          <SeverityDistributionChart
            critical={severityData.critical}
            high={severityData.high}
            medium={severityData.medium}
            low={severityData.low}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ActivityFeed findings={data?.findings} linkPrefix="/dashboard/gcp/findings" />
        </div>

        <div className="space-y-6">
          {/* AI Security Insights */}
          <GlassCard className="p-6 border-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">GCP Insights</h3>
                <p className="text-xs text-white/40">Powered by Claude</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-white/70">
                Your <span className="text-blue-400 font-medium">{data?.stats.projectName}</span> project
                has <Link href="/dashboard/gcp/findings?severity=CRITICAL" className="text-red-400 hover:text-red-300 underline underline-offset-2">
                  {data?.stats.critical || 0} critical issues
                </Link> requiring immediate attention.
              </p>
              <ul className="space-y-2 text-white/60">
                {criticalFindings.slice(0, 3).map((finding) => (
                  <Link key={finding.id} href="/dashboard/gcp/findings?severity=CRITICAL" className="block">
                    <li className="flex items-start gap-2 hover:text-white transition-colors cursor-pointer">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                      {finding.title}
                    </li>
                  </Link>
                ))}
                {criticalFindings.length === 0 && (
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                    No critical issues found - great work!
                  </li>
                )}
              </ul>
            </div>
            <Link href="/dashboard/gcp/findings">
              <Button
                variant="ghost"
                className="w-full mt-4 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-2"
              >
                View All Findings
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </GlassCard>

          <SecurityScore score={data?.stats.riskScore || 0} previousScore={(data?.stats.riskScore || 0) - 5} />

          {/* Critical Alerts */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Critical Alerts</h3>
              <Link href="/dashboard/gcp/findings?severity=CRITICAL">
                <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 font-medium hover:bg-red-500/20 cursor-pointer transition-colors">
                  {criticalFindings.length} active
                </span>
              </Link>
            </div>
            <div className="space-y-3">
              {criticalFindings.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-4">No critical alerts</p>
              ) : (
                criticalFindings.slice(0, 3).map((finding) => (
                  <Link key={finding.id} href="/dashboard/gcp/findings?severity=CRITICAL">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer group">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 font-medium truncate group-hover:text-white">
                          {finding.title}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {finding.resource}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-red-400 transition-colors" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Phase Summary */}
      <PhaseSummary phases={data?.phases} linkPrefix="/dashboard/gcp/findings" />
    </div>
  );
}
