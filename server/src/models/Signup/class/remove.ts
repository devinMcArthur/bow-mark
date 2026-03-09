import { SignupDocument } from "@models";

const document = async (signup: SignupDocument) => {
  await signup.remove();

  return;
};

export default {
  document,
};
