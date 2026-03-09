const validateMongooseArrayLength = (
  message = "must have at least one",
  min = 1
) => {
  return {
    validator: (val: unknown[]) => val.length >= min,
    message,
  };
};

export default validateMongooseArrayLength;
