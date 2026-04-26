import type { CurrentMacBaseline } from "../../domain/catalog/mac-model.js";
import type { DetectedMac, MacDetector } from "../ports.js";

export interface DetectMacResult {
  detected: DetectedMac;
  baseline: CurrentMacBaseline;
}

export async function detectMacUseCase(deps: { detector: MacDetector }): Promise<DetectMacResult> {
  const detected = await deps.detector.detect();
  const baseline = deps.detector.toBaseline(detected);
  return { detected, baseline };
}
