import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function EncountersPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Encounters</h1>
          <p className="text-muted-foreground">
            Clinical visits and charge capture
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Encounter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search encounters..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium mb-2">Phase 2: Coming Soon</p>
            <p className="text-sm">
              AI-powered charge capture will be implemented in Phase 2.
              <br />
              This includes CPT/ICD-10 code suggestions with confidence scoring.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
