#!/usr/bin/env node
import { detectMac } from "./detect.js";

async function main(): Promise<void> {
  const spec = await detectMac();

  console.log("=== Current Mac ===");
  console.log(`Model:        ${spec.modelName} (${spec.modelIdentifier})`);
  console.log(`Chip:         ${spec.chip}`);
  const coreDetail =
    spec.performanceCores !== undefined && spec.efficiencyCores !== undefined
      ? ` (${spec.performanceCores}P + ${spec.efficiencyCores}E)`
      : "";
  console.log(`CPU cores:    ${spec.cpuCores}${coreDetail}`);
  if (spec.gpuCores) console.log(`GPU cores:    ${spec.gpuCores}`);
  console.log(`Memory:       ${spec.memoryGB} GB`);
  console.log(`Storage:      ${spec.storageGB} GB`);
  if (spec.displayResolution) console.log(`Display:      ${spec.displayResolution}`);
  console.log(`Serial:       ${spec.serialNumber}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
