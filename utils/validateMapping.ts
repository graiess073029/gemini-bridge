import { LabelMapping } from "../types.js";

export const validateLabelMapping = (map: LabelMapping): void => {
  if (!map.cpu) throw new Error("Missing CPU mapping");
  if (!Array.isArray(map.cpu.cores)) throw new Error("Invalid CPU cores mapping");
  if (!Array.isArray(map.fans)) throw new Error("Invalid fans mapping");
  map.cpu.cores.forEach((core) => {
    if (!Array.isArray(core.usageSensors))
      throw new Error(`Invalid usageSensors for ${core.name}`);
  });
};