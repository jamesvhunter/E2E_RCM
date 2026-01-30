import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // Check if organization already exists
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({
        message: "Organization already exists",
        organizationId: existing.id,
      });
    }

    // Create default organization
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: "Freed RCM Medical Group",
        tax_id: "12-3456789",
        npi: "1234567890",
        address_line_1: "123 Healthcare Blvd",
        address_line_2: "Suite 100",
        city: "San Francisco",
        state: "CA",
        zip_code: "94102",
        phone: "(415) 555-0100",
      })
      .select()
      .single();

    if (error) {
      console.error("Seed organization error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Organization created successfully",
      organization: data,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
