import { SensorCandidate } from "../types.js";

export const buildPrompt = (candidates: SensorCandidate[]): string => {
  return `
You are an expert hardware telemetry engineer with deep knowledge of all hardware monitoring software including HWiNFO, LibreHardwareMonitor, OpenHardwareMonitor, AIDA64, and others.

You have complete knowledge of how every CPU, GPU, motherboard, and peripheral vendor names their sensors.

Your task is to analyze a list of hardware sensor candidates and map each one to the correct semantic slot in the output JSON.

STEP 1 — ANALYZE ALL SENSOR GROUPS

Before mapping any sensor, examine every group name in the candidate list. Identify what hardware component each group represents.

dGPU group recognition:
- The group name starts with "dGPU" or "GPU [#n]" where n is a number
- OR the group name contains a discrete GPU vendor with a model number: "NVIDIA GeForce RTX", "NVIDIA GeForce GTX", "NVIDIA GeForce GT", "AMD Radeon RX", "AMD Radeon HD", "Intel Arc"
- The group has many sensors including VRAM sensors with unit MB: "Memory Available", "Memory Allocated", "D3D Memory Dedicated", "D3D Memory Dynamic"
- This is the dedicated GPU with its own video memory

iGPU group recognition:
- The group name starts with "iGPU"
- OR the group name contains integrated graphics names: "Intel UHD Graphics", "Intel Iris", "Intel HD Graphics", "AMD Radeon Graphics" (without RX/HD model number)
- The group has fewer sensors and NEVER has dedicated VRAM sensors with unit MB
- This is the integrated GPU that shares system RAM

CPU group recognition:
- The group name contains "CPU", processor model name, or core-related labels
- Contains voltage, clock, temperature, usage sensors for processor cores

System/Memory group recognition:
- The group name contains "System", "Memory", "DRAM"
- Contains physical memory used/available sensors

Battery group recognition:
- The group name contains "Battery"
- Contains charge level, voltage, charge rate sensors

Fan group recognition:
- Any candidate with unit "RPM" regardless of group

STEP 2 — DECIDE GPU CONFIGURATION

After analyzing all groups, determine the GPU setup:

If a dGPU group exists (has VRAM sensors in MB):
- Map dGPU sensors to the "gpu" block
- If an iGPU group also exists, map iGPU sensors to the "iGpu" block
- If no iGPU group exists, set all "iGpu" fields to null

If no dGPU group exists but an iGPU group exists:
- Map iGPU sensors to the "iGpu" block
- Set all "gpu" fields to null

If no GPU group exists at all:
- Set all "gpu" and "iGpu" fields to null

STEP 3 — MAP SENSORS

STRICT OUTPUT RULES

- Return ONLY valid JSON
- No markdown, no explanations, no comments, no trailing commas
- EVERY mapped sensor in the output must be an object with exactly two fields: { "sensorId": <number>, "labelOriginal": <exact string from the candidate "label" field> }
- The sensorId must be the exact numeric id from the candidate's "sensorId" property
- The labelOriginal must be the exact string from the candidate's "label" property — do not modify, abbreviate, or reformat it
- NEVER return actual sensor readings, temperatures, percentages, watts, MHz, MB, or any measured data
- NEVER use the index field — it is volatile and changes between HWiNFO sessions
- NEVER invent sensor labels or sensorIds — only use values that exist in the provided candidates
- You may use ANY property from the candidate objects to make your decision (label, sensorId, unit, group, type, etc.)
- If a sensor cannot be confidently identified, use null for the entire slot (not an object)

GPU SENSOR MAPPING — EXACT PRIORITY

For dGPU (gpu block):
- usage: "GPU Core Load" if available, else "GPU Total Usage", else "GPU D3D Usage"
- clock: "GPU Clock" if available, else first clock sensor in the dGPU group
- temperature: "GPU Temperature" if available, else "GPU Core Temperature"
- power: "GPU Power" if available
- vramAllocated: "GPU Memory Allocated" if available, else "GPU D3D Memory Dedicated"
- vramAvailable: "GPU Memory Available" if available

For iGPU (iGpu block):
- usage: "GPU Total Usage" if available, else "GPU D3D Usage", else "GPU Computing Usage"
- clock: "GPU Clock" if available
- temperature: "GPU Core Temperature" if available, else "GPU Temperature"
- power: "IGPU Power" if available, else "GPU Power" (only if in iGPU group)
- vramAllocated: "GPU D3D Memory Dynamic" if available, else null

CPU VOLTAGE

- Look for the CPU core voltage or VID sensor
- Common labels: "CPU Core Voltage", "CPU Vcore", "Core VID", "CPU VID", "Vcore"
- Must be a voltage sensor (unit "V") from the CPU group
- Map to cpu.voltage
- If no voltage sensor is found, set to null

CPU PER-CORE TEMPERATURES

- Many modern CPUs expose per-core temperature sensors
- Look for sensors labeled "Core 0 TjMax", "Core 0 Distance to TjMax", "Core 0 Temperature", "CPU Core 0", "P-core 0", "E-core 6", etc.
- For each physical core identified in cpu.cores, attempt to find its corresponding temperature sensor
- Map the per-core temperature directly into the core entry as temperatureSensor
- If a core has no dedicated temperature sensor, set temperatureSensor to null

WHAT TO IGNORE

Never map these to any slot:
- Historical min/max/average values
- Throttling or power limit indicators (Yes/No sensors)
- Distance-to-TjMax sensors (unless used for per-core temperature calculation)
- C-state residency sensors
- Per-thread utility sensors
- Frame time or FPS sensors (PresentMon)
- PCIe error counters
- Voltage offset sensors
- Bus clock or uncore clock
- Storage sensors — set all storage fields to null

FAN RULES

- Every candidate with unit "RPM" is a fan or pump
- Add ALL RPM candidates to the fans array automatically
- Use the candidate label as the fan name
- Do not limit or filter fans
- Each fan entry must be an object with: { "name": <string>, "sensorId": <number>, "labelOriginal": <exact candidate label string> }

CPU CORE TOPOLOGY RULES

- Analyze the full candidate list to reconstruct the CPU core topology
- For Intel hybrid CPUs: identify Performance cores and Efficiency cores separately
- For AMD SMT CPUs: each core has two threads, use "standard" type
- For each core, group all its thread usage sensors together in usageSensors
- For core clock, use the effective core clock sensor, not the actual or utility clock
- For core temperature, use the per-core temperature sensor if available
- Each core entry must represent one physical core with all its logical threads

Example of a correct core entry:
{
  "name": "Core 0",
  "type": "performance",
  "usageSensors": [
    { "sensorId": 4026532608, "labelOriginal": "P-core 0 T0 Usage" },
    { "sensorId": 4026532608, "labelOriginal": "P-core 0 T1 Usage" }
  ],
  "clockSensor": {
    "sensorId": 4026532608,
    "labelOriginal": "P-core 0 Clock"
  },
  "temperatureSensor": {
    "sensorId": 4026532864,
    "labelOriginal": "P-core 0"
  }
}

EXPECTED JSON STRUCTURE

Every mapped sensor value is an object { "sensorId": <number>, "labelOriginal": <exact string> }.
Use null (not an object) for any slot that cannot be confidently identified.

{
  "cpu": {
    "usage": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "clock": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "temperature": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "voltage": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "power": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "cores": [
      {
        "name": string,
        "type": "performance" | "efficiency" | "standard",
        "usageSensors": [
          { "sensorId": <number>, "labelOriginal": <exact label> }
        ],
        "clockSensor": { "sensorId": <number>, "labelOriginal": <exact label> } | null,
        "temperatureSensor": { "sensorId": <number>, "labelOriginal": <exact label> } | null
      }
    ]
  },
  "gpu": {
    "usage": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "clock": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "temperature": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "power": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "vramAllocated": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "vramAvailable": { "sensorId": <number>, "labelOriginal": <label> } | null
  },
  "iGpu": {
    "usage": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "clock": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "temperature": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "power": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "vramAllocated": { "sensorId": <number>, "labelOriginal": <label> } | null
  },
  "memory": {
    "usage": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "available": { "sensorId": <number>, "labelOriginal": <label> } | null
  },
  "fans": [
    { "name": string, "sensorId": <number>, "labelOriginal": <exact label> }
  ],
  "battery": {
    "level": { "sensorId": <number>, "labelOriginal": <label> } | null,
    "chargeRate": { "sensorId": <number>, "labelOriginal": <label> } | null
  }
}

AVAILABLE TELEMETRY CANDIDATES

${JSON.stringify(candidates, null, 2)}
`;
};



