import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Clock, User } from "lucide-react";

export default function OperationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Work Queue</h1>
          <p className="text-muted-foreground">
            Items requiring attention and action
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>1 Pending</Badge>
          <Badge variant="outline">0 In Progress</Badge>
        </div>
      </div>

      {/* Queue Summary */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <QueueCard type="Coverage Incomplete" count={1} color="yellow" />
        <QueueCard type="Eligibility Failed" count={0} color="red" />
        <QueueCard type="Charge Review" count={0} color="blue" />
        <QueueCard type="Claim Rejected" count={0} color="red" />
        <QueueCard type="Remit Unmatched" count={0} color="orange" />
        <QueueCard type="Denial Review" count={0} color="purple" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="coverage_incomplete">Coverage Incomplete</SelectItem>
                <SelectItem value="eligibility_failed">Eligibility Failed</SelectItem>
                <SelectItem value="charge_review">Charge Review</SelectItem>
                <SelectItem value="claim_rejected">Claim Rejected</SelectItem>
                <SelectItem value="remit_unmatched">Remit Unmatched</SelectItem>
                <SelectItem value="denial_review">Denial Review</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="pending">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Sample Work Item */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Missing subscriber information</span>
                    <Badge variant="outline" className="text-xs">Coverage Incomplete</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Coverage policy is missing subscriber relationship details
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Robert Lee
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      1 day ago
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">
                  Priority 7
                </Badge>
                <Button size="sm">
                  Work Item
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QueueCard({
  type,
  count,
  color,
}: {
  type: string;
  count: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    yellow: "bg-yellow-500/10 text-yellow-600",
    red: "bg-red-500/10 text-red-600",
    blue: "bg-blue-500/10 text-blue-600",
    orange: "bg-orange-500/10 text-orange-600",
    purple: "bg-purple-500/10 text-purple-600",
  };

  return (
    <Card className="text-center">
      <CardContent className="pt-4">
        <div className={`text-2xl font-bold ${count > 0 ? colorClasses[color].split(" ")[1] : "text-muted-foreground"}`}>
          {count}
        </div>
        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {type}
        </div>
      </CardContent>
    </Card>
  );
}
