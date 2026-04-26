import pc from "picocolors";
import type { DetectedMac } from "../../../application/ports.js";
import { header, renderKeyValue } from "./text.js";

export function renderMacBlock(detected: DetectedMac): string {
  const coreDetail =
    detected.performanceCores !== undefined && detected.efficiencyCores !== undefined
      ? ` (${detected.performanceCores}P + ${detected.efficiencyCores}E)`
      : "";
  return [
    header("Current Mac"),
    renderKeyValue([
      { key: "Model", value: `${detected.modelName} ${pc.dim(`(${detected.modelIdentifier})`)}` },
      { key: "Chip", value: detected.chip },
      { key: "CPU cores", value: `${detected.cpuCores}${coreDetail}` },
      ...(detected.gpuCores ? [{ key: "GPU cores", value: String(detected.gpuCores) }] : []),
      { key: "Memory", value: `${detected.memoryGB} GB` },
      { key: "Storage", value: `${detected.storageGB} GB` },
      ...(detected.displayResolution
        ? [{ key: "Display", value: detected.displayResolution }]
        : []),
      { key: "Serial", value: detected.serialNumber },
    ]),
  ].join("\n");
}
