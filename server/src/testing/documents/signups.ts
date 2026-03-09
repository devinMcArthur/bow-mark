import { Signup, SignupDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededSignups {
  base_laborer_3_signup: SignupDocument;
}

const createSignups = async (): Promise<SeededSignups> => {
  const base_laborer_3_signup = new Signup({
    _id: _ids.signups.base_laborer_3_signup._id,
    employee: _ids.employees.base_laborer_3,
  });

  const signups = {
    base_laborer_3_signup,
  };

  for (let i = 0; i < Object.values(signups).length; i++) {
    await Object.values(signups)[i].save();
  }

  return signups;
};

export default createSignups;
