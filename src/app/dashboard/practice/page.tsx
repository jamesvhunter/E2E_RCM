"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, MapPin, CreditCard, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { NewProviderDialog } from "@/components/practice/NewProviderDialog";
import { NewLocationDialog } from "@/components/practice/NewLocationDialog";
import { OrganizationDialog } from "@/components/practice/OrganizationDialog";

export default function PracticePage() {
  const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isOrganizationDialogOpen, setIsOrganizationDialogOpen] = useState(false);
  const [isEditingOrganization, setIsEditingOrganization] = useState(false);

  // Fetch organization data
  const { data: organization, refetch: refetchOrganization } = trpc.practice.getOrganization.useQuery();

  // Fetch providers
  const { data: providers, refetch: refetchProviders } = trpc.practice.listProviders.useQuery({});

  // Fetch locations
  const { data: locations, refetch: refetchLocations } = trpc.practice.listLocations.useQuery({});

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

      <Tabs defaultValue="providers" className="space-y-6">
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
              {organization ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Organization Name</div>
                      <div className="font-medium">{organization.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Tax ID</div>
                      <div className="font-medium">{organization.tax_id || "Not set"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">NPI</div>
                      <div className="font-medium">{organization.npi || "Not set"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="font-medium">{organization.phone || "Not set"}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground">Address</div>
                      <div className="font-medium">
                        {organization.address_line_1}
                        {organization.address_line_2 && <>, {organization.address_line_2}</>}
                        <br />
                        {organization.city}, {organization.state} {organization.zip_code}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingOrganization(true);
                        setIsOrganizationDialogOpen(true);
                      }}
                    >
                      Edit Organization
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No organization configured yet.</p>
                  <Button
                    className="mt-4"
                    onClick={() => {
                      setIsEditingOrganization(false);
                      setIsOrganizationDialogOpen(true);
                    }}
                  >
                    Create Organization
                  </Button>
                </div>
              )}
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
              <Button onClick={() => setIsProviderDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </Button>
            </CardHeader>
            <CardContent>
              {providers && providers.length > 0 ? (
                <div className="space-y-4">
                  {providers.map((provider: any) => (
                    <ProviderRow
                      key={provider.id}
                      name={`${provider.first_name} ${provider.last_name}${provider.credentials ? ", " + provider.credentials : ""}`}
                      npi={provider.npi}
                      taxonomy={provider.taxonomy_code || "N/A"}
                      isBilling={provider.is_billing_provider}
                      isRendering={provider.is_rendering_provider}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No providers added yet.</p>
                  <Button className="mt-4" onClick={() => setIsProviderDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Provider
                  </Button>
                </div>
              )}
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
              <Button onClick={() => setIsLocationDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </CardHeader>
            <CardContent>
              {locations && locations.length > 0 ? (
                <div className="space-y-4">
                  {locations.map((location: any) => (
                    <LocationRow
                      key={location.id}
                      name={location.name}
                      address={`${location.address_line_1}${location.address_line_2 ? ", " + location.address_line_2 : ""}, ${location.city}, ${location.state} ${location.zip_code}`}
                      pos={location.place_of_service_code || "11"}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No locations added yet.</p>
                  <Button className="mt-4" onClick={() => setIsLocationDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Location
                  </Button>
                </div>
              )}
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

      {/* Dialogs */}
      <OrganizationDialog
        open={isOrganizationDialogOpen}
        onOpenChange={setIsOrganizationDialogOpen}
        organization={isEditingOrganization ? organization : null}
        onSuccess={() => {
          refetchOrganization();
          setIsOrganizationDialogOpen(false);
        }}
      />

      <NewProviderDialog
        open={isProviderDialogOpen}
        onOpenChange={setIsProviderDialogOpen}
        onSuccess={() => {
          refetchProviders();
          setIsProviderDialogOpen(false);
        }}
      />

      <NewLocationDialog
        open={isLocationDialogOpen}
        onOpenChange={setIsLocationDialogOpen}
        onSuccess={() => {
          refetchLocations();
          setIsLocationDialogOpen(false);
        }}
      />
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
}: {
  name: string;
  address: string;
  pos: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-accent" />
        </div>
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-muted-foreground">
            {address} · POS: {pos}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm">Edit</Button>
    </div>
  );
}
