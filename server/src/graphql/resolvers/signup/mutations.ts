import { Signup, SignupDocument } from "@models";

const create = async (employeeId: string): Promise<SignupDocument> => {
  const signup = await Signup.createDocument(employeeId);

  await signup.save();

  return signup;
};

export default {
  create,
};
