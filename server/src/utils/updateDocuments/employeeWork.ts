import { EmployeeWork } from "@models";
import dayjs from "dayjs";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const updateToV1 = async () => {
  const employeeWorks = await EmployeeWork.find({
    schemaVersion: undefined,
  });

  if (employeeWorks.length > 0) {
    console.log(
      `Updating ${employeeWorks.length} EmployeeWork document(s) to Schema Version 1...`
    );

    for (let i = 0; i < employeeWorks.length; i++) {
      const employeeWork = employeeWorks[i];

      if (employeeWork.startTime) {
        const offset = dayjs(employeeWork.startTime)
          .tz("America/Edmonton")
          .utcOffset();
        employeeWork.startTime = dayjs(employeeWork.startTime)
          .add(Math.abs(offset), "minutes")
          .toDate();
      } else {
        employeeWork.startTime = new Date();
      }

      if (employeeWork.endTime) {
        const offset = dayjs(employeeWork.endTime)
          .tz("America/Edmonton")
          .utcOffset();
        employeeWork.endTime = dayjs(employeeWork.endTime)
          .add(Math.abs(offset), "minutes")
          .toDate();
      } else {
        employeeWork.endTime = new Date();
      }

      employeeWork.schemaVersion = 1;

      await employeeWork.save();
    }

    console.log(
      `...successfully updated ${employeeWorks.length} EmployeeWork document(s) to Schema Version 1.`
    );

    return;
  }

  return;
};

const updateToV2 = async () => {
  const employeeWorks = await EmployeeWork.find({
    schemaVersion: 1,
  });

  if (employeeWorks.length > 0) {
    console.log(
      `Updating ${employeeWorks.length} EmployeeWork document(s) to Schema Version 2...`
    );

    for (let i = 0; i < employeeWorks.length; i++) {
      // Mark as archived if parent daily report is archived
      const employeeWork = employeeWorks[i];
      const dailyReport = await employeeWork.getDailyReport();

      if (dailyReport && dailyReport.archived) {
        await employeeWork.archive();
      }

      employeeWork.schemaVersion = 2;

      await employeeWork.save();
    }

    console.log(
      `...successfully updated ${employeeWorks.length} EmployeeWork document(s) to Schema Version 2.`
    );
  }
};

const updateEmployeeWork = async () => {
  await updateToV1();

  await updateToV2();

  return;
};

export default updateEmployeeWork;
