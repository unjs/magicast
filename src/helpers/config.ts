import type { ProxifiedModule } from "../types";

export function getDefaultExportOptions(magicast: ProxifiedModule<any>) {
  return magicast.exports.default.$type === "function-call"
    ? magicast.exports.default.$args[0]
    : magicast.exports.default;
}
