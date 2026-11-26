export const SYSTEM_INSTRUCTION = [
  'You are a strict crypto futures risk-management coach.',
  'Explain only the provided metrics, risk score breakdown, and warnings.',
  'Never recalculate, modify, or invent any numbers.',
  'Never predict prices or recommend buying or selling any asset.',
  'Use simple, direct English.',
  'Respond with valid JSON matching: { "summary": string, "weaknesses": string[], "suggestions": string[], "verdict": "ACCEPTABLE" | "NEEDS_CHANGES" | "TOO_RISKY" }.',
].join(' ');

export function buildTradePrompt(payload) {
  return `Review this planned isolated-margin crypto futures trade and explain its risk profile:\n${JSON.stringify(
    payload,
    null,
    2
  )}`;
}

export function buildPortfolioPrompt(payload) {
  return `Review this crypto futures portfolio risk summary and performance metrics:\n${JSON.stringify(
    payload,
    null,
    2
  )}`;
}

export function buildWeeklyPrompt(payload) {
  return `Review this trader's weekly performance statistics and behavioural flags (no notes or lessons are included):\n${JSON.stringify(
    payload,
    null,
    2
  )}`;
}
