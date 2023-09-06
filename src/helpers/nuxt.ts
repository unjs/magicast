import type { ProxifiedModule } from "../proxy/types";
import { getDefaultExportOptions } from "./config";
import { deepMergeObject } from "./deep-merge";

export function addNuxtModule(
  magicast: ProxifiedModule<any>,
  name: string,
  optionsKey?: string,
  options?: any,
) {
  const config = getDefaultExportOptions(magicast);

  config.modules ||= [];
  if (!config.modules.includes(name)) {
    config.modules.push(name);
  }

  if (optionsKey) {
    config[optionsKey] ||= {};
    deepMergeObject(config[optionsKey], options);
  }
}
