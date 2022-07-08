import { EmployeeWorkDocument } from "@models";
import { IEmployeeWorkUpdate } from "@typescript/employeeWork";
import dayjs from "dayjs";

const document = async (
  employeeWork: EmployeeWorkDocument,
  data: IEmployeeWorkUpdate
) => {
  employeeWork.jobTitle = data.jobTitle;

  employeeWork.startTime = data.startTime;

  employeeWork.endTime = data.endTime;

  return;
};

const date = async (employeeWork: EmployeeWorkDocument, date: Date) => {
  const year = dayjs(date).get("year");
  const month = dayjs(date).get("month");
  const day = dayjs(date).get("date");

  employeeWork.startTime = dayjs(employeeWork.startTime)
    .set("year", year)
    .set("month", month)
    .set("date", day)
    .toDate();
  employeeWork.endTime = dayjs(employeeWork.endTime)
    .set("year", year)
    .set("month", month)
    .set("date", day)
    .toDate();

  return;
};

const archive = (employeeWork: EmployeeWorkDocument) => {
  employeeWork.archivedAt = new Date();
};

export default {
  document,
  date,
  archive,
};
