import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase";

const OWNER_LOGIN = "srizzon";

async function checkAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const login = (
    user.user_metadata.user_name ??
    user.user_metadata.preferred_username ??
    ""
  ).toLowerCase();
  return login === OWNER_LOGIN ? user : null;
}

// Create a new ad
export async function POST(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, brand, text, description, color, bg_color, link, vehicle, priority, starts_at, ends_at } = body;

  if (!id || !brand || !text) {
    return NextResponse.json({ error: "Missing required fields: id, brand, text" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("sky_ads").insert({
    id,
    brand,
    text,
    description: description ?? null,
    color: color ?? "#f8d880",
    bg_color: bg_color ?? "#1a1018",
    link: link ?? null,
    vehicle: vehicle ?? "plane",
    priority: priority ?? 50,
    starts_at: starts_at ?? null,
    ends_at: ends_at ?? null,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

// Update an existing ad
export async function PUT(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing ad id" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("sky_ads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

// Soft delete (set active = false)
export async function DELETE(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing ad id" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("sky_ads")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
