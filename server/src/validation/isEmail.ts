import Validator from "validator";

// Ensures provided email is a valid email
export default (email: unknown) => {
  return Validator.isEmail(`${email}`);
};
