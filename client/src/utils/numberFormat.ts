/**
 * Format a numeric value with thousand separators for display in NumberInput.
 * "12345.67" → "12,345.67". Pair with `parseThousands` so the underlying form
 * state stays numeric while the input shows the comma-grouped representation.
 */
export const formatThousands = (
  val: string | number | undefined | null
): string => {
  if (val === undefined || val === null || val === "") return "";
  const stripped =
    typeof val === "string" ? val.replace(/,/g, "") : String(val);
  if (stripped === "" || stripped === "-") return stripped;
  const [whole, fraction] = stripped.split(".");
  const n = parseInt(whole, 10);
  if (Number.isNaN(n)) return stripped;
  const formattedWhole = n.toLocaleString("en-US");
  return fraction !== undefined
    ? `${formattedWhole}.${fraction}`
    : formattedWhole;
};

/** Strip formatting commas before the value gets back into form state. */
export const parseThousands = (val: string): string => val.replace(/,/g, "");

/**
 * HTML5 input `pattern` attribute compatible with `formatThousands` output.
 *
 * Chakra's NumberInput defaults `pattern` to `"[0-9]*(.[0-9]+)?"`, which
 * rejects commas. With `format={formatThousands}` the DOM `<input>`'s value
 * is the comma-grouped string, so the default pattern blocks form submit
 * with the browser-native "Please match the requested format" message.
 *
 * Always pass this constant alongside `format={formatThousands}`.
 */
export const THOUSANDS_PATTERN = "^-?[0-9,]*\\.?[0-9]*$";
