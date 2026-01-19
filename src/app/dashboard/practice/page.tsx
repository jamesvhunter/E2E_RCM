import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, MapPin, CreditCard } from "lucide-react";

export default function PracticePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Practice Setup</h1>
          <p className="text-muted-foreground">
            Configure organization, providers, and locations
          </p>
        </div>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="w-4 h-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <User className="w-4 h-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="w-4 h-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="payers" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Payer Enrollment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Billing entity information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Organization Name</div>
                  <div className="font-medium">ClaimFlow Medical Group</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Tax ID</div>
                  <div className="font-medium">12-3456789</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">NPI</div>
                  <div className="font-medium">1234567890</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium">415-555-0100</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">Address</div>
                  <div className="font-medium">
                    123 Healthcare Blvd, Suite 100<br />
                    San Francisco, CA 94102
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Button variant="outline">Edit Organization</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Providers</CardTitle>
                <CardDescription>Physicians and clinical staff</CardDescription>
              </div>
              <Button>Add Provider</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ProviderRow
                  name="Sarah Johnson, MD"
                  npi="1234567890"
                  taxonomy="207Q00000X"
                  isBilling
                  isRendering
                />
                <ProviderRow
                  name="Michael Chen, MD"
                  npi="0987654321"
                  taxonomy="207Q00000X"
                  isRendering
                />
                <ProviderRow
                  name="Emily Williams, NP"
                  npi="1122334455"
                  taxonomy="363L00000X"
                  isRendering
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Locations</CardTitle>
                <CardDescription>Service facilities</CardDescription>
              </div>
              <Button>Add Location</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <LocationRow
                  name="Main Clinic"
                  address="123 Healthcare Blvd, Suite 100, San Francisco, CA 94102"
                  pos="11"
                  isPrimary
                />
                <LocationRow
                  name="Downtown Office"
                  address="456 Market Street, Floor 3, San Francisco, CA 94105"
                  pos="11"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payers">
          <Card>
            <CardHeader>
              <CardTitle>Payer Enrollment</CardTitle>
              <CardDescription>Transaction enrollment status with Stedi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium mb-2">Phase 3: Coming Soon</p>
                <p className="text-sm">
                  Stedi enrollment orchestration will be implemented in Phase 3.
                  <br />
                  This includes enrollment status tracking and task management.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProviderRow({
  name,
  npi,
  taxonomy,
  isBilling,
  isRendering,
}: {
  name: string;
  npi: string;
  taxonomy: string;
  isBilling?: boolean;
  isRendering?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-muted-foreground">
            NPI: {npi} · Taxonomy: {taxonomy}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isBilling && <Badge variant="outline">Billing</Badge>}
        {isRendering && <Badge variant="outline">Rendering</Badge>}
        <Button variant="ghost" size="sm">Edit</Button>
      </div>
    </div>
  );
}

function LocationRow({
  name,
  address,
  pos,
  isPrimary,
}: {
  name: string;
  address: string;
  pos: string;
  isPrimary?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-accent" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{name}</span>
            {isPrimary && <Badge variant="secondary">Primary</Badge>}
          </div>
          <div className="text-sm text-muted-foreground">
            {address} · POS: {pos}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm">Edit</Button>
    </div>
  );
}
