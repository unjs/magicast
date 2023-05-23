import type { Proxified } from "../types";

export function deepMergeObject(magicast: Proxified<any>, object: any) {
  if (typeof object === "object") {
    for (const key in object) {
      if (
        typeof magicast[key] === "object" &&
        typeof object[key] === "object"
      ) {
        deepMergeObject(magicast[key], object[key]);
      } else {
        magicast[key] = object[key];
      }
    }
  }
}
