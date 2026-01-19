/**
 * Seed Payers Script
 * Fetches payers from Stedi API and seeds the database
 *
 * Usage: npx tsx scripts/seed-payers.ts
 */

import { createClient } from "@supabase/supabase-js";

const STEDI_API_BASE = "https://healthcare.us.stedi.com/2024-04-01";

interface StediPayer {
  stediId: string;
  primaryPayerId: string;
  displayName: string;
  names?: string[];
  aliases?: string[];
  avatarUrl?: string;
  operatingStates?: string[];
  coverageTypes?: ("medical" | "dental" | "vision")[];
  transactionSupport?: {
    eligibilityCheck?: "SUPPORTED" | "NOT_SUPPORTED" | "ENROLLMENT_REQUIRED";
    claimStatus?: "SUPPORTED" | "NOT_SUPPORTED" | "ENROLLMENT_REQUIRED";
    professionalClaimSubmission?: "SUPPORTED" | "NOT_SUPPORTED" | "ENROLLMENT_REQUIRED";
    claimPayment?: "SUPPORTED" | "NOT_SUPPORTED" | "ENROLLMENT_REQUIRED";
  };
}

interface StediPayersResponse {
  items: StediPayer[];
}

async function fetchPayersFromStedi(): Promise<StediPayer[]> {
  const apiKey = process.env.STEDI_API_KEY;

  if (!apiKey || apiKey === "your-stedi-api-key") {
    throw new Error("STEDI_API_KEY environment variable is not set or is placeholder value");
  }

  console.log("Fetching payers from Stedi API...");

  const response = await fetch(`${STEDI_API_BASE}/payers`, {
    method: "GET",
    headers: {
      "Authorization": `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch payers: ${response.status} - ${errorText}`);
  }

  const data: StediPayersResponse = await response.json();
  console.log(`✓ Fetched ${data.items.length} payers from Stedi`);

  return data.items;
}

async function seedDatabase(payers: StediPayer[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables not set");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("\nSeeding payers table...");

  // Filter to only payers that support eligibility checks
  const eligiblePayers = payers.filter(
    (p) => p.transactionSupport?.eligibilityCheck === "SUPPORTED"
  );

  console.log(`Found ${eligiblePayers.length} payers with eligibility check support`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const payer of eligiblePayers) {
    // Determine payer type based on coverage types
    let payerType = "commercial";
    if (payer.displayName.toLowerCase().includes("medicare") ||
        payer.displayName.toLowerCase().includes("cms")) {
      payerType = "medicare";
    } else if (payer.displayName.toLowerCase().includes("medicaid")) {
      payerType = "medicaid";
    }

    // Check if payer already exists
    const { data: existing } = await supabase
      .from("payers")
      .select("id")
      .eq("stedi_payer_id", payer.stediId)
      .single();

    if (existing) {
      // Update existing payer
      const { error } = await supabase
        .from("payers")
        .update({
          name: payer.displayName,
          payer_type: payerType,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("stedi_payer_id", payer.stediId);

      if (error) {
        console.error(`  ✗ Failed to update ${payer.displayName}:`, error.message);
        skipped++;
      } else {
        updated++;
      }
    } else {
      // Insert new payer
      const { error } = await supabase
        .from("payers")
        .insert({
          stedi_payer_id: payer.stediId,
          name: payer.displayName,
          payer_type: payerType,
          is_active: true,
        });

      if (error) {
        console.error(`  ✗ Failed to insert ${payer.displayName}:`, error.message);
        skipped++;
      } else {
        inserted++;
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Seeding Complete");
  console.log("=".repeat(60));
  console.log(`✓ Inserted: ${inserted} new payers`);
  console.log(`✓ Updated: ${updated} existing payers`);
  if (skipped > 0) {
    console.log(`✗ Skipped: ${skipped} payers (errors)`);
  }
  console.log("=".repeat(60));
}

async function main() {
  try {
    console.log("=".repeat(60));
    console.log("Stedi Payers Seeding Script");
    console.log("=".repeat(60));

    const payers = await fetchPayersFromStedi();
    await seedDatabase(payers);

    console.log("\n✓ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
