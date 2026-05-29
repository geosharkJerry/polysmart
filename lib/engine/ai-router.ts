export type AiProvider = "gemini" | "chatgpt" | "claude";

export interface AiRouteInput {
  topic: string;
  textLength: number;
  urgency: "low" | "medium" | "high";
}

export function selectAiProvider(input: AiRouteInput): AiProvider {
  if (input.urgency === "high") {
    return "chatgpt";
  }
  if (input.textLength > 3200 || /hearing|legal|regulation|bill/i.test(input.topic)) {
    return "claude";
  }
  if (/macro|fomc|cpi|nfp|fed/i.test(input.topic)) {
    return "gemini";
  }
  return "chatgpt";
}
