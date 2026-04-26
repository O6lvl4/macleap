import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface MacSpec {
  modelName: string;
  modelIdentifier: string;
  modelNumber?: string;
  chip: string;
  cpuCores: number;
  performanceCores?: number;
  efficiencyCores?: number;
  gpuCores?: number;
  memoryGB: number;
  storageGB: number;
  serialNumber: string;
  displayResolution?: string;
}

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

export async function detectMac(): Promise<MacSpec> {
  const [hardware, displays, storage] = await Promise.all([
    runProfiler<SystemProfilerHardware>("SPHardwareDataType"),
    runProfiler<SystemProfilerDisplays>("SPDisplaysDataType"),
    runProfiler<SystemProfilerStorage>("SPStorageDataType"),
  ]);

  const hw = hardware.SPHardwareDataType[0];
  const gpu = displays.SPDisplaysDataType[0];

  const rootVolume =
    storage.SPStorageDataType.find((s) => s.mount_point === "/") ?? storage.SPStorageDataType[0];
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
