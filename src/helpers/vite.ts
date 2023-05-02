import { builders } from "../builders";
import { ProxifiedFunctionCall, ProxifiedModule } from "../proxy/types";
import { getDefaultExportOptions } from "./config";
import { deepMergeObject } from "./deep-merge";

export interface AddVitePluginOptions {
  /**
   * The import path of the plugin
   */
  from: string;
  /**
   * The import name of the plugin
   * @default "default"
   */
  imported?: string;
  /**
   * The name of local variable
   */
  constructor: string;
  /**
   * The options of the plugin
   */
  options?: Record<string, any>;

  /**
   * The index in the plugins array where the plugin should be inserted at.
   * By default, the plugin is appended to the array.
   */
  index?: number;
}

export interface UpdateVitePluginConfigOptions {
  /**
   * The import path of the plugin
   */
  from: string;
  /**
   * The import name of the plugin
   * @default "default"
   */
  imported?: string;
}

export function addVitePlugin(
  magicast: ProxifiedModule<any>,
  plugin: AddVitePluginOptions
) {
  const config = getDefaultExportOptions(magicast);

  const insertionIndex = plugin.index ?? config.plugins?.length ?? 0;

  config.plugins ||= [];
  config.plugins.splice(
    insertionIndex,
    0,
    plugin.options
      ? builders.functionCall(plugin.constructor, plugin.options)
      : builders.functionCall(plugin.constructor)
  );

  magicast.imports.$add({
    from: plugin.from,
    local: plugin.constructor,
    imported: plugin.imported || "default",
  });

  return true;
}

export function findVitePluginCall(
  magicast: ProxifiedModule<any>,
  plugin: UpdateVitePluginConfigOptions | string
): ProxifiedFunctionCall | undefined {
  const _plugin =
    typeof plugin === "string" ? { from: plugin, imported: "default" } : plugin;

  const config = getDefaultExportOptions(magicast);

  const constructor = magicast.imports.$items.find(
    (i) =>
      i.from === _plugin.from && i.imported === (_plugin.imported || "default")
  )?.local;

  return config.plugins?.find(
    (p: any) => p && p.$type === "function-call" && p.$callee === constructor
  );
}

export function updateVitePluginConfig(
  magicast: ProxifiedModule<any>,
  plugin: UpdateVitePluginConfigOptions | string,
  handler: Record<string, any> | ((args: any[]) => any[])
) {
  const item = findVitePluginCall(magicast, plugin);
  if (!item) {
    return false;
  }

  if (typeof handler === "function") {
    item.$args = handler(item.$args);
  } else if (item.$args[0]) {
    deepMergeObject(item.$args[0], handler);
  } else {
    item.$args[0] = handler;
  }

  return true;
}
