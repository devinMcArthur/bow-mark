import { User, VehicleIssueDocument } from "@models";
import { UserRoles, UserTypes } from "@typescript/user";
import email from "@utils/email";

const sendAssignedToNotifiation = async (
  vehicleIssue: VehicleIssueDocument
) => {
  const assignedToEmployee = await vehicleIssue.getAssignedTo();
  if (!assignedToEmployee) return;

  const assignedTo = await assignedToEmployee?.getUser();
  if (!assignedTo) return;

  const content = `
      <p>A new vehicle issue has been assigned to you</p>
      <h2>${vehicleIssue.title}</h2>
      <p>${vehicleIssue.description}</p>
      <p><b>Priority: </b>${vehicleIssue.priority}</p>
      <p><b>Link: </b>${await vehicleIssue.getLink()}</p>
    `;

  await email.sendEmail(
    assignedTo.email,
    `Vehicle Issue - ${vehicleIssue.title}`,
    content
  );
};

const sendSubscribedNotifications = async (
  vehicleIssue: VehicleIssueDocument
) => {
  const subject = `Vehicle Issue - ${vehicleIssue.title}`;
  const content = `
      <p>A new vehicle issue has been created with priority ${
        vehicleIssue.priority
      }</p>
      <h2>${vehicleIssue.title}</h2>
      <p>${vehicleIssue.description}</p>
      <p><b>Priority: </b>${vehicleIssue.priority}</p>
      <p><b>Link: </b>${await vehicleIssue.getLink()}</p>
  `;

  const subscribedUsers = await User.getBySubscribedPriority(
    vehicleIssue.priority
  );

  for (let i = 0; i < subscribedUsers.length; i++) {
    const user = subscribedUsers[i];

    if (
      user.role === UserRoles.Admin ||
      (user.role === UserRoles.ProjectManager &&
        user.types.includes(UserTypes.VehicleMaintenance))
    ) {
      // Send Email
      await email.sendEmail(user.email, subject, content);
    }
  }
};

const sendNotifications = async (vehicleIssue: VehicleIssueDocument) => {
  await vehicleIssue.sendAssignedToNotification();
  await vehicleIssue.sendSubscribedNotifications();
};

export default {
  sendAssignedToNotifiation,
  sendSubscribedNotifications,
  sendNotifications,
};
