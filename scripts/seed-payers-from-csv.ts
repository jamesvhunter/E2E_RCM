/**
 * Seed Payers from CSV
 * Parses the Stedi payers CSV and seeds the database
 *
 * Usage: npx tsx scripts/seed-payers-from-csv.ts
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import * as path from "path";
config({ path: path.join(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

interface StediPayerCSVRow {
  StediId: string;
  PrimaryPayerId: string;
  DisplayName: string;
  Names: string;
  Aliases: string;
  EligibilityInquiry: string;
  CoverageTypes: string;
  OperatingStates: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function parseCSV(csvPath: string): StediPayerCSVRow[] {
  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const lines = fileContent.split("\n").filter((line) => line.trim());

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse rows
  const payers: StediPayerCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length < headers.length) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    payers.push(row as StediPayerCSVRow);
  }

  return payers;
}

function determinePayerType(payer: StediPayerCSVRow): string {
  const name = payer.DisplayName.toLowerCase();

  if (name.includes("medicare") || name.includes("cms")) {
    return "medicare";
  }

  if (name.includes("medicaid")) {
    return "medicaid";
  }

  if (name.includes("dental") && !name.includes("medical")) {
    return "dental";
  }

  if (name.includes("vision") && !name.includes("medical")) {
    return "vision";
  }

  return "commercial";
}

async function seedDatabase(payers: StediPayerCSVRow[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables not set");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("\nSeeding payers table from CSV...");

  // Filter to only payers that support eligibility checks
  const eligiblePayers = payers.filter(
    (p) => p.EligibilityInquiry === "true"
  );

  console.log(`Total payers in CSV: ${payers.length}`);
  console.log(`Payers with eligibility support: ${eligiblePayers.length}`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // Process in batches for better performance
  const batchSize = 50;

  for (let i = 0; i < eligiblePayers.length; i += batchSize) {
    const batch = eligiblePayers.slice(i, i + batchSize);

    for (const payer of batch) {
      const payerType = determinePayerType(payer);

      // Check if payer already exists
      const { data: existing } = await supabase
        .from("payers")
        .select("id")
        .eq("stedi_payer_id", payer.StediId)
        .single();

      if (existing) {
        // Update existing payer
        const { error } = await supabase
          .from("payers")
          .update({
            name: payer.DisplayName,
            payer_type: payerType,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("stedi_payer_id", payer.StediId);

        if (error) {
          console.error(`  ✗ Failed to update ${payer.DisplayName}:`, error.message);
          skipped++;
        } else {
          updated++;
        }
      } else {
        // Insert new payer
        const { error } = await supabase.from("payers").insert({
          stedi_payer_id: payer.StediId,
          name: payer.DisplayName,
          payer_type: payerType,
          is_active: true,
        });

        if (error) {
          console.error(`  ✗ Failed to insert ${payer.DisplayName}:`, error.message);
          skipped++;
        } else {
          inserted++;
        }
      }
    }

    // Progress indicator
    const processed = Math.min(i + batchSize, eligiblePayers.length);
    const percent = ((processed / eligiblePayers.length) * 100).toFixed(1);
    console.log(`  Processing: ${processed}/${eligiblePayers.length} (${percent}%)`);
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
    console.log("Stedi Payers CSV Seeding Script");
    console.log("=".repeat(60));

    // Find CSV file
    const csvPath = path.join(process.cwd(), "stedi_payers_2026-01-19.csv");

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }

    console.log(`Reading CSV from: ${csvPath}`);

    const payers = parseCSV(csvPath);
    await seedDatabase(payers);

    console.log("\n✓ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
