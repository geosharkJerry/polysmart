import { NextRequest, NextResponse } from "next/server";
import { selectAiProvider } from "@/lib/engine/ai-router";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const topic = String(payload.topic || "");
  const text = String(payload.text || "");
  const urgency = payload.urgency === "high" || payload.urgency === "low" ? payload.urgency : "medium";

  if (!topic || !text) {
    return NextResponse.json({ message: "topic and text are required" }, { status: 400 });
  }

  const provider = selectAiProvider({ topic, textLength: text.length, urgency });
  return NextResponse.json({ provider, reason: "Routed by topic, text length, and urgency." });
}
