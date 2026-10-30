import { buildLlmsTxt } from "@/lib/llms";

export function GET() {
  return buildLlmsTxt(false);
}
