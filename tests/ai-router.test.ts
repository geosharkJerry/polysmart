import { describe, expect, it } from "vitest";
import { selectAiProvider } from "@/lib/engine/ai-router";

describe("AI router", () => {
  it("routes urgent topics to chatgpt", () => {
    expect(selectAiProvider({ topic: "breaking cpi", textLength: 300, urgency: "high" })).toBe("chatgpt");
  });

  it("routes legal-heavy text to claude", () => {
    expect(selectAiProvider({ topic: "bill hearing", textLength: 5000, urgency: "medium" })).toBe("claude");
  });
});
