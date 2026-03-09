import { z } from "zod";

export const optionalFormText = (max: number) =>
  z.preprocess((value) => (value == null ? "" : value), z.string().max(max));

export const formBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "on", "yes"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "off", "no", ""].includes(normalized)) {
      return false;
    }
  }

  if (value == null) {
    return false;
  }

  return value;
}, z.boolean());
