export default function populateOptions<T>(options: T, defaults: T): T {
  // Ensure options are an object
  let includeOptions = true;
  if (Object.prototype.toString.call(options) !== "[object Object]") {
    includeOptions = false;
  }

  // Ensure defaults are an object
  if (Object.prototype.toString.call(defaults) !== "[object Object]") {
    throw new Error("populateOptions: Defaults provided are not an object");
  }

  if (includeOptions) {
    return {
      ...defaults,
      ...options,
    };
  } else {
    return defaults;
  }
}
