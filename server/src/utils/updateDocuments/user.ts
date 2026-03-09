import { User } from "@models";
import { UserRoles } from "@typescript/user";

const updateToV1 = async () => {
  const users = await User.find({
    schemaVersion: undefined,
  });

  if (users.length > 0) {
    console.log(
      `Updating ${users.length} User document(s) to Schema Version 1...`
    );

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      // ensure user has employee
      await user.getEmployee();

      user.schemaVersion = 1;

      await user.save();
    }

    console.log(
      `...successfully updated ${users.length} User document(s) to Schema Version 1.`
    );
  }
};

const updateToV2 = async () => {
  const users = await User.find({
    schemaVersion: 1,
  });

  if (users.length > 0) {
    console.log(
      `Updating ${users.length} User document(s) to Schema Version 2...`
    );

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      if (user.admin === true) {
        user.role = UserRoles.Admin;
      } else if (user.projectManager === true) {
        user.role = UserRoles.ProjectManager;
      } else {
        user.role = UserRoles.User;
      }

      user.schemaVersion = 2;

      await user.save();
    }

    console.log(
      `...successfully updated ${users.length} User document(s) to Schema Version 2.`
    );
  }

  return;
};

const updateUser = async () => {
  await updateToV1();
  await updateToV2();

  return;
};

export default updateUser;
