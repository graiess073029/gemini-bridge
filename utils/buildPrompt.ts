import { SensorCandidate } from "../types.js";

export const buildPrompt = (candidates: SensorCandidate[]): string => {
  return `
You are an expert hardware telemetry engineer with deep knowledge of all hardware monitoring software including HWiNFO, LibreHardwareMonitor, OpenHardwareMonitor, AIDA64, and others.

You have complete knowledge of how every CPU, GPU, motherboard, and peripheral vendor names their sensors — including Intel, AMD, NVIDIA, MSI, ASUS, Gigabyte, ASRock, Dell, Lenovo, HP, and all other manufacturers.

Your task is to analyze a list of hardware sensor candidates and map each one to the correct semantic slot in the output JSON.

━━━━━━━━━━━━━━━━━━━
STRICT OUTPUT RULES
━━━━━━━━━━━━━━━━━━━

- Return ONLY valid JSON
- No markdown, no explanations, no comments, no trailing commas
- EVERY mapped sensor in the output must be an object with exactly two fields: { "sensorId": <number>, "labelOriginal": <exact string from the candidate "label" field> }
- The sensorId must be the exact numeric id from the candidate's "sensorId" property (this is the group/sensor ID)
- The labelOriginal must be the exact string from the candidate's "label" property — do not modify, abbreviate, or reformat it
- NEVER return actual sensor readings, temperatures, percentages, watts, MHz, MB, or any measured data
- NEVER use the index field — it is volatile and changes between HWiNFO sessions
- NEVER use the readingId field — it is not unique and must be completely ignored
- NEVER invent sensor labels or sensorIds — only use values that exist in the provided candidates
- You may use ANY property from the candidate objects to make your decision (label, sensorId, unit, group, readingId, etc.) — there are no restricted properties
- If a sensor cannot be confidently identified, use null for the entire slot (not an object)

━━━━━━━━━━━━━━━━━━━
YOUR APPROACH
━━━━━━━━━━━━━━━━━━━

Use your hardware knowledge to understand what each sensor measures regardless of its name.
Sensor names vary across vendors, software versions, and hardware generations.
You must identify the correct sensor by understanding its semantic meaning, not by matching keywords.

Examples of the same concept named differently:
- CPU die temperature: "CPU Package", "Tctl/Tdie", "Core Temp", "CPU Temp", "Die Temp", "CPU Junction"
- CPU total usage: "Total CPU Usage", "CPU Usage", "CPU Load", "Processor Total"
- GPU core load: "GPU Core Load", "GPU Usage", "GPU Load", "3D Usage"
- RAM used: "Physical Memory Used", "Memory Used", "RAM Used", "Used RAM"
- Battery charge rate: "Charge Rate", "Battery Power", "AC Power", "Charging Power"

Always pick the most representative single sensor for each slot:
- For temperatures: the whole-package or die temperature, not per-core or junction
- For clocks: the average or boost clock, not base or bus clock
- For usage: the total aggregate, not per-core or per-thread
- For VRAM: the currently allocated amount and the total available capacity
- For iGPU: sensors from the integrated graphics unit that shares system memory, not the dedicated GPU

Never map sensors across hardware groups.
CPU sensors must come from CPU-related groups.
GPU sensors must come from GPU-related groups.
Battery sensors must come from battery-related groups.

CRITICAL: The labelOriginal field in each output object must contain the exact candidate label string.
Do not modify, abbreviate, or reformat labels — copy them exactly as provided.
Example: if a candidate shows "label": "P-core 0 T0 Usage", you must output { "sensorId": 3, "labelOriginal": "P-core 0 T0 Usage" }, not "P-core 0 T0" or any variation.

━━━━━━━━━━━━━━━━━━━
DGPU vs IGPU — CRITICAL DISTINCTION
━━━━━━━━━━━━━━━━━━━

You MUST distinguish between the dedicated GPU (dGPU) and the integrated GPU (iGPU).

**dGPU (Dedicated GPU):**
- Has its own independent sensor group (e.g., "NVIDIA GeForce RTX 3060", "AMD Radeon RX 6700 XT")
- ALWAYS has VRAM sensors (vramAllocated, vramAvailable) — this is the definitive identifier
- Has its own power sensor separate from CPU package power
- Typically manufactured by NVIDIA or AMD as a discrete card
- Examples of dGPU groups: "GPU [#0] NVIDIA GeForce RTX 3060", "GPU [#1] AMD Radeon RX 6600"

**iGPU (Integrated GPU):**
- Usually lives INSIDE the CPU sensor group (especially on Intel platforms)
- On AMD: may appear in a separate "Radeon Graphics" group but still shares system RAM
- NEVER has VRAM sensors — it uses system RAM instead of dedicated video memory
- Does NOT have vramAllocated or vramAvailable sensors
- Power consumption is typically rolled into CPU package power, not measured separately
- Examples of iGPU sensors found in CPU groups:
  - Intel: "GPU Temperature", "GT Cores", "GPU Clock", "GPU Usage", "GPU Power"
  - AMD: "SoC Temperature", "GFX Temperature", "GFX Clock", "GPU Load"

**How to tell them apart:**
1. Look for VRAM sensors — ONLY the dGPU has them
2. Check the sensor group name:
   - dGPU: standalone group with GPU vendor name (NVIDIA/AMD)
   - iGPU: either inside CPU group (Intel) or in a shared SoC/Graphics group (AMD)
3. iGPU clock sensors are often labeled "GPU Clock" or "GFX Clock" inside CPU/SoC groups
4. dGPU clock sensors are labeled "GPU Clock" or "Core Clock" in the dedicated GPU group

**NEVER map dGPU sensors to iGPU slots or vice versa.**
If only one GPU exists in the system:
- If it has VRAM → map to "gpu" (dGPU), set "iGpu" to null
- If it has no VRAM → map to "iGpu", set "gpu" to null

━━━━━━━━━━━━━━━━━━━
IGPU TEMPERATURE, POWER & VRAM ALLOCATION
━━━━━━━━━━━━━━━━━━━

The iGPU may expose temperature, power, and VRAM allocation sensors even though it uses system RAM.

**iGPU Temperature:**
- Look for sensors labeled "GPU Temperature", "GFX Temperature", or "GT Cores" within the CPU or iGPU group
- Map to iGpu.temperature if found
- If no temperature sensor exists for the iGPU, set to null

**iGPU Power:**
- Look for sensors labeled "GPU Power", "GT Power", "SoC Power", or "GFX Power" within the CPU or iGPU group
- This represents the power draw of the integrated graphics unit
- Map to iGpu.power if found
- If no power sensor exists for the iGPU, set to null

**iGPU VRAM Allocation:**
- Some platforms (especially Intel) expose "GPU Memory Allocated" or "GPU DMEM" sensors
- This represents how much system RAM is currently reserved for the iGPU
- Map to iGpu.vramAllocated if found
- If no allocation sensor exists, set to null
- The maximum iGPU memory is handled separately by the application (typically 50% of system RAM)

━━━━━━━━━━━━━━━━━━━
CPU VOLTAGE
━━━━━━━━━━━━━━━━━━━

- Look for the CPU core voltage or VID (Voltage Identification) sensor
- Common labels: "CPU Core Voltage", "CPU Vcore", "Core VID", "CPU VID", "Vcore"
- Must be a voltage sensor (unit "V") from the CPU group
- Map to cpu.voltage
- If no voltage sensor is found, set to null

━━━━━━━━━━━━━━━━━━━
CPU PER-CORE TEMPERATURES
━━━━━━━━━━━━━━━━━━━

- Many modern CPUs expose per-core temperature sensors in addition to the package temperature
- Look for sensors labeled "Core 0 TjMax", "Core 0 Distance to TjMax", "Core 0 Temperature", "CPU Core 0", etc.
- For each physical core identified in cpu.cores, attempt to find its corresponding temperature sensor
- Map the per-core temperature directly into the core entry as temperatureSensor
- If a core has no dedicated temperature sensor, set temperatureSensor to null
- Do NOT invent temperature sensors — only include those that actually exist in the candidates

━━━━━━━━━━━━━━━━━━━
WHAT TO IGNORE
━━━━━━━━━━━━━━━━━━━

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
- Storage sensors — storage is handled by a separate service, set all storage fields to null

━━━━━━━━━━━━━━━━━━━
FAN RULES
━━━━━━━━━━━━━━━━━━━

- Every candidate with unit "RPM" is a fan or pump
- Add ALL RPM candidates to the fans array automatically
- Use the candidate label as the fan name
- Do not limit or filter fans — include every single RPM sensor found
- Each fan entry must be an object with: { "name": <string>, "sensorId": <number>, "labelOriginal": <exact candidate label string> }

━━━━━━━━━━━━━━━━━━━
CPU CORE TOPOLOGY RULES
━━━━━━━━━━━━━━━━━━━

- Analyze the full candidate list to reconstruct the CPU core topology
- For Intel hybrid CPUs: identify Performance cores and Efficiency cores separately
- For AMD SMT CPUs: each core has two threads, use "standard" type
- For each core, group all its thread usage sensors together in usageSensors
- For core clock, use the actual core clock sensor, not the effective or utility clock
- For core temperature, use the per-core temperature sensor if available (e.g., "Core 0 TjMax", "Core 0 Temp")
- Each core entry must represent one physical core with all its logical threads

Example of a correct core entry:
{
  "name": "Core 0",
  "type": "performance",
  "usageSensors": [
    { "sensorId": 12, "labelOriginal": "P-core 0 T0 Usage" },
    { "sensorId": 13, "labelOriginal": "P-core 0 T1 Usage" }
  ],
  "clockSensor": {
    "sensorId": 24,
    "labelOriginal": "P-core 0 Clock"
  },
  "temperatureSensor": {
    "sensorId": 36,
    "labelOriginal": "Core 0 TjMax"
  }
}

━━━━━━━━━━━━━━━━━━━
EXPECTED JSON STRUCTURE
━━━━━━━━━━━━━━━━━━━

Every mapped sensor value is an object { "sensorId": <number>, "labelOriginal": <exact string> }.
Use null (not an object) for any slot that cannot be confidently identified.

{
  "cpu": {
    "usage": { "sensorId": <number>, "labelOriginal": <label of total aggregate CPU utilization> } | null,
    "clock": { "sensorId": <number>, "labelOriginal": <label of average/boost CPU clock> } | null,
    "temperature": { "sensorId": <number>, "labelOriginal": <label of CPU package/die temperature> } | null,
    "voltage": { "sensorId": <number>, "labelOriginal": <label of CPU core voltage in V> } | null,
    "power": { "sensorId": <number>, "labelOriginal": <label of CPU package power in watts> } | null,
    "cores": [
      {
        "name": string,
        "type": "performance" | "efficiency" | "standard",
        "usageSensors": [
          { "sensorId": <number>, "labelOriginal": <exact candidate label string> }
        ],
        "clockSensor": { "sensorId": <number>, "labelOriginal": <exact candidate label string> } | null,
        "temperatureSensor": { "sensorId": <number>, "labelOriginal": <exact candidate label string> } | null
      }
    ]
  },
  "gpu": {
    "usage": { "sensorId": <number>, "labelOriginal": <label of dedicated GPU core utilization> } | null,
    "clock": { "sensorId": <number>, "labelOriginal": <label of dedicated GPU core clock> } | null,
    "temperature": { "sensorId": <number>, "labelOriginal": <label of dedicated GPU core temperature> } | null,
    "power": { "sensorId": <number>, "labelOriginal": <label of dedicated GPU power in watts> } | null,
    "vramAllocated": { "sensorId": <number>, "labelOriginal": <label of allocated dedicated GPU memory in MB> } | null,
    "vramAvailable": { "sensorId": <number>, "labelOriginal": <label of total available dedicated GPU memory in MB> } | null
  },
  "iGpu": {
    "usage": { "sensorId": <number>, "labelOriginal": <label of integrated GPU utilization> } | null,
    "clock": { "sensorId": <number>, "labelOriginal": <label of integrated GPU clock> } | null,
    "temperature": { "sensorId": <number>, "labelOriginal": <label of integrated GPU temperature> } | null,
    "power": { "sensorId": <number>, "labelOriginal": <label of integrated GPU power in watts> } | null,
    "vramAllocated": { "sensorId": <number>, "labelOriginal": <label of integrated GPU allocated memory> } | null
  },
  "memory": {
    "usage": { "sensorId": <number>, "labelOriginal": <label of used physical RAM in MB> } | null,
    "available": { "sensorId": <number>, "labelOriginal": <label of available physical RAM in MB> } | null
  },
  "fans": [
    { "name": string, "sensorId": <number>, "labelOriginal": <exact candidate label of the RPM sensor> }
  ],
  "battery": {
    "level": { "sensorId": <number>, "labelOriginal": <label of battery charge percentage> } | null,
    "chargeRate": { "sensorId": <number>, "labelOriginal": <label of battery charging/discharging power in watts> } | null
  }
}

━━━━━━━━━━━━━━━━━━━
AVAILABLE TELEMETRY CANDIDATES
━━━━━━━━━━━━━━━━━━━

${JSON.stringify(candidates, null, 2)}
`;
};



