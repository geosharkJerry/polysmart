import { NextResponse } from "next/server";
import { healthCheckAllConnectors } from "@/lib/services/connectors";

export async function GET() {
  const rows = await healthCheckAllConnectors();
  return NextResponse.json({ connectors: rows });
}
