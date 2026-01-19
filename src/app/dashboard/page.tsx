import {
  Users,
  Stethoscope,
  Receipt,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Revenue cycle overview and key metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            Export Report
          </Button>
          <Button size="sm">
            New Encounter
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Patients"
          value="3"
          description="Active patients"
          icon={Users}
          trend={{ value: "+2", direction: "up" }}
        />
        <StatCard
          title="Open Encounters"
          value="1"
          description="Pending charges"
          icon={Stethoscope}
          trend={{ value: "0", direction: "neutral" }}
        />
        <StatCard
          title="Claims in Progress"
          value="0"
          description="Submitted / Awaiting"
          icon={Receipt}
          trend={{ value: "0", direction: "neutral" }}
        />
        <StatCard
          title="A/R Balance"
          value="$300.00"
          description="Total outstanding"
          icon={DollarSign}
          trend={{ value: "+$300", direction: "up" }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Work Queue Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Work Queue</CardTitle>
              <Link href="/dashboard/operations">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowUpRight className="ml-1 w-3 h-3" />
                </Button>
              </Link>
            </div>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <WorkQueueItem
                type="Coverage Incomplete"
                count={1}
                priority="high"
              />
              <WorkQueueItem
                type="Charge Review"
                count={0}
                priority="medium"
              />
              <WorkQueueItem
                type="Claim Rejected"
                count={0}
                priority="high"
              />
              <WorkQueueItem
                type="Eligibility Failed"
                count={0}
                priority="medium"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ActivityItem
                icon={CheckCircle}
                title="Charge set finalized"
                description="John Smith - 99395, 90471"
                time="2 hours ago"
                status="success"
              />
              <ActivityItem
                icon={Users}
                title="Patient created"
                description="Robert Lee added to system"
                time="1 day ago"
                status="info"
              />
              <ActivityItem
                icon={AlertCircle}
                title="Coverage incomplete"
                description="Work item created for Robert Lee"
                time="1 day ago"
                status="warning"
              />
              <ActivityItem
                icon={Clock}
                title="System initialized"
                description="ClaimFlow Phase 0 foundation complete"
                time="Just now"
                status="info"
              />
            </div>
          </CardContent>
        </Card>

        {/* Claim Pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Claim Pipeline</CardTitle>
            <CardDescription>Claims by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <PipelineStage label="Ready" count={0} />
              <PipelineStage label="Submitted" count={0} />
              <PipelineStage label="Accepted" count={0} />
              <PipelineStage label="Rejected" count={0} color="destructive" />
              <PipelineStage label="Adjudicated" count={0} />
              <PipelineStage label="Closed" count={0} color="success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/patients">
              <QuickAction
                icon={Users}
                label="Add Patient"
                description="Register new patient"
              />
            </Link>
            <Link href="/dashboard/encounters">
              <QuickAction
                icon={Stethoscope}
                label="New Encounter"
                description="Start clinical visit"
              />
            </Link>
            <Link href="/dashboard/claims">
              <QuickAction
                icon={Receipt}
                label="Review Claims"
                description="Check claim status"
              />
            </Link>
            <Link href="/dashboard/practice">
              <QuickAction
                icon={TrendingUp}
                label="Practice Setup"
                description="Configure providers"
              />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  trend: { value: string; direction: "up" | "down" | "neutral" };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend.direction !== "neutral" && (
            <span
              className={`flex items-center text-xs ${
                trend.direction === "up" ? "text-green-500" : "text-red-500"
              }`}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkQueueItem({
  type,
  count,
  priority,
}: {
  type: string;
  count: number;
  priority: "high" | "medium" | "low";
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${
            priority === "high"
              ? "bg-red-500"
              : priority === "medium"
              ? "bg-yellow-500"
              : "bg-green-500"
          }`}
        />
        <span className="text-sm">{type}</span>
      </div>
      <Badge variant={count > 0 ? "default" : "secondary"}>{count}</Badge>
    </div>
  );
}

function ActivityItem({
  icon: Icon,
  title,
  description,
  time,
  status,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  time: string;
  status: "success" | "warning" | "info";
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${
          status === "success"
            ? "bg-green-500/10 text-green-500"
            : status === "warning"
            ? "bg-yellow-500/10 text-yellow-500"
            : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {time}
      </span>
    </div>
  );
}

function PipelineStage({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color?: "destructive" | "success";
}) {
  return (
    <div className="text-center p-4 rounded-lg bg-muted/50">
      <div
        className={`text-2xl font-bold ${
          color === "destructive"
            ? "text-red-500"
            : color === "success"
            ? "text-green-500"
            : ""
        }`}
      >
        {count}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  description,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer">
      <Icon className="w-5 h-5 text-primary mb-2" />
      <p className="font-medium text-sm">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
