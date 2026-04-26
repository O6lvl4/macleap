import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChipSpec, ChipVariant } from "../../domain/catalog/chip.js";
import type { CurrentMacBaseline } from "../../domain/catalog/mac-model.js";
import type { Family } from "../../domain/catalog/family.js";
import type { DetectedMac, MacDetector } from "../../application/ports.js";

const execFileAsync = promisify(execFile);

interface SystemProfilerHardware {
  SPHardwareDataType: Array<{
    machine_name?: string;
    machine_model?: string;
    model_number?: string;
    chip_type?: string;
    number_processors?: string | number;
    physical_memory?: string;
    serial_number?: string;
  }>;
}

interface SystemProfilerDisplays {
  SPDisplaysDataType: Array<{
    sppci_cores?: string;
    spdisplays_ndrvs?: Array<{
      _spdisplays_pixels?: string;
      _spdisplays_resolution?: string;
    }>;
  }>;
}

interface SystemProfilerStorage {
  SPStorageDataType: Array<{
    size_in_bytes?: number;
    mount_point?: string;
  }>;
}

const RESOLUTION_TO_SIZE: Array<{ pattern: RegExp; sizeInch: number; family: Family }> = [
  { pattern: /3456\s*x\s*2234/, sizeInch: 16, family: "MacBook Pro" },
  { pattern: /3024\s*x\s*1964/, sizeInch: 14, family: "MacBook Pro" },
  { pattern: /2880\s*x\s*1864/, sizeInch: 15, family: "MacBook Air" },
  { pattern: /2560\s*x\s*1664/, sizeInch: 13, family: "MacBook Air" },
  { pattern: /2408\s*x\s*1506/, sizeInch: 13, family: "MacBook Neo" },
];

const STORAGE_TIERS = [128, 256, 512, 1024, 2048, 4096, 8192];

async function runProfiler<T>(dataType: string): Promise<T> {
  const { stdout } = await execFileAsync("system_profiler", ["-json", dataType]);
  return JSON.parse(stdout) as T;
}

function parseMemoryGB(text: string | undefined): number {
  if (!text) return 0;
  const match = text.match(/(\d+(?:\.\d+)?)\s*GB/i);
  return match ? Number.parseFloat(match[1]) : 0;
}

function parseLeadingInt(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const match = value.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

interface CpuCoreCounts {
  total: number;
  performance?: number;
  efficiency?: number;
}

function parseCpuCores(value: string | number | undefined): CpuCoreCounts {
  if (typeof value === "number") return { total: value };
  if (!value) return { total: 0 };
  const procMatch = value.match(/proc\s+(\d+):(\d+):(\d+)/i);
  if (procMatch) {
    return {
      total: Number.parseInt(procMatch[1], 10),
      performance: Number.parseInt(procMatch[2], 10),
      efficiency: Number.parseInt(procMatch[3], 10),
    };
  }
  return { total: parseLeadingInt(value) };
}

function parseChip(chipText: string): ChipSpec {
  const cleaned = chipText.replace(/^Apple\s+/i, "").trim();
  const m = cleaned.match(/^M(\d+)(?:\s+(Pro|Max|Ultra))?/i);
  if (m) {
    return {
      family: "M",
      generation: Number.parseInt(m[1], 10),
      variant: ((m[2] ?? "") as ChipVariant),
    };
  }
  const a = cleaned.match(/^A(\d+)(?:\s+(Pro|Max))?/i);
  if (a) {
    return {
      family: "A",
      generation: Number.parseInt(a[1], 10),
      variant: ((a[2] ?? "") as ChipVariant),
    };
  }
  return { family: "M", generation: 0, variant: "" };
}

function inferFamilyAndSize(detected: DetectedMac): { family: Family; screenSizeInch: number } {
  if (detected.displayResolution) {
    for (const entry of RESOLUTION_TO_SIZE) {
      if (entry.pattern.test(detected.displayResolution)) {
        return { family: entry.family, screenSizeInch: entry.sizeInch };
      }
    }
  }

  const name = detected.modelName.toLowerCase();
  if (name.includes("macbook pro")) return { family: "MacBook Pro", screenSizeInch: 14 };
  if (name.includes("macbook air")) return { family: "MacBook Air", screenSizeInch: 13 };
  if (name === "macbook") return { family: "MacBook Neo", screenSizeInch: 13 };
  if (name.includes("imac")) return { family: "iMac", screenSizeInch: 24 };
  if (name.includes("mac mini")) return { family: "Mac mini", screenSizeInch: 0 };
  if (name.includes("mac studio")) return { family: "Mac Studio", screenSizeInch: 0 };
  if (name.includes("mac pro")) return { family: "Mac Pro", screenSizeInch: 0 };

  return { family: "MacBook Pro", screenSizeInch: 14 };
}

function normalizeStorage(gb: number): number {
  for (const tier of STORAGE_TIERS) {
    if (gb <= tier) return tier;
  }
  return STORAGE_TIERS[STORAGE_TIERS.length - 1];
}

export class SystemProfilerDetector implements MacDetector {
  async detect(): Promise<DetectedMac> {
    const [hardware, displays, storage] = await Promise.all([
      runProfiler<SystemProfilerHardware>("SPHardwareDataType"),
      runProfiler<SystemProfilerDisplays>("SPDisplaysDataType"),
      runProfiler<SystemProfilerStorage>("SPStorageDataType"),
    ]);

    const hw = hardware.SPHardwareDataType[0];
    const gpu = displays.SPDisplaysDataType[0];

    const rootVolume =
      storage.SPStorageDataType.find((s) => s.mount_point === "/") ??
      storage.SPStorageDataType[0];
    const storageBytes = rootVolume?.size_in_bytes ?? 0;

    const display = gpu?.spdisplays_ndrvs?.[0];
    const cpu = parseCpuCores(hw.number_processors);

    return {
      modelName: hw.machine_name ?? "Unknown",
      modelIdentifier: hw.machine_model ?? "Unknown",
      modelNumber: hw.model_number,
      chip: hw.chip_type ?? "Unknown",
      cpuCores: cpu.total,
      performanceCores: cpu.performance,
      efficiencyCores: cpu.efficiency,
      gpuCores: parseLeadingInt(gpu?.sppci_cores),
      memoryGB: parseMemoryGB(hw.physical_memory),
      storageGB: Math.round(storageBytes / 1024 ** 3),
      serialNumber: hw.serial_number ?? "Unknown",
      displayResolution: display?._spdisplays_pixels ?? display?._spdisplays_resolution,
    };
  }

  toBaseline(detected: DetectedMac): CurrentMacBaseline {
    const { family, screenSizeInch } = inferFamilyAndSize(detected);
    return {
      family,
      screenSizeInch,
      chip: parseChip(detected.chip),
      memoryGB: detected.memoryGB,
      storageGB: normalizeStorage(detected.storageGB),
    };
  }
}
