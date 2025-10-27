import type { Proxified } from "../types";

export function deepMergeObject(magicast: Proxified<any>, object: any) {
  if (typeof object === "object" && object !== null) {
    for (const key in object) {
      const magicastValue = magicast[key];
      const objectValue = object[key];

      // Check for identity to prevent infinite recursion
      if (magicastValue === objectValue) {
        continue;
      }

      if (
        typeof magicastValue === "object" &&
        magicastValue !== null &&
        typeof objectValue === "object" &&
        objectValue !== null
      ) {
        deepMergeObject(magicastValue, objectValue);
      } else {
        magicast[key] = objectValue;
      }
    }
  }
}
