import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/services/billing";

export async function GET(_: NextRequest, { params }: { params: { userId: string } }) {
  const profile = getProfile(params.userId);
  if (!profile) {
    return NextResponse.json({ message: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  const payload = await request.json();
  const result = updateProfile(params.userId, payload);

  if ("error" in result) {
    const code = result.error === "Profile not found" ? 404 : 400;
    return NextResponse.json({ message: result.error }, { status: code });
  }

  return NextResponse.json(result.profile);
}
