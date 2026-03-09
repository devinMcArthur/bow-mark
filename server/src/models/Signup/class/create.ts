import { Employee, SignupDocument, SignupModel } from "@models";
import { Id } from "@typescript/models";

const document = async (
  Signup: SignupModel,
  employeeId: Id
): Promise<SignupDocument> => {
  const existingSignup = await Signup.getByEmployee(employeeId);
  if (existingSignup) await existingSignup.remove();

  const employee = await Employee.getById(employeeId);
  if (!employee)
    throw new Error("Signup.createDocument: unable to find employee");

  const signup = new Signup({
    employee: employee._id,
  });

  return signup;
};

export default {
  document,
};
