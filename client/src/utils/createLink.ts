import createQueryString from "./createQueryString";

const employee = (employeeId: string) => {
  return `/employee/${employeeId}`;
};

const vehicle = (vehicleId: string) => {
  return `/vehicle/${vehicleId}`;
};

const vehicleOperatorDailyReportCreate = (vehicleId: string) => {
  return vehicle(vehicleId) + "/report";
};

const crew = (crewId: string) => {
  return `/crew/${crewId}`;
};

export enum JobsiteQueryKeys {
  jobsiteMaterial = "jobsite-material",
}
interface IJobsiteQueryString {
  jobsiteMaterialId?: string;
}
const jobsite = (jobsiteId: string, options?: IJobsiteQueryString) => {
  let queryString = "";
  if (options) {
    const optionObject: Record<string, string> = {};

    if (options.jobsiteMaterialId)
      optionObject[JobsiteQueryKeys.jobsiteMaterial] =
        options.jobsiteMaterialId;

    queryString = createQueryString(optionObject);
  }

  return `/jobsite/${jobsiteId}${queryString}`;
};

const jobsiteDailyReports = (jobsiteId: string) => {
  return `/jobsite/${jobsiteId}/daily-reports`;
};

const jobsiteMonthReport = (reportId: string) => {
  return `/jobsite-month-report/${reportId}`;
};

const jobsiteYearReport = (reportId: string) => {
  return `/jobsite-year-report/${reportId}`;
};

const jobsiteYearMasterReport = (reportId: string) => {
  return `/jobsite-year-master-report/${reportId}`;
};

const dailyReport = (dailyReportId: string) => {
  return `/daily-report/${dailyReportId}`;
};

const company = (companyId: string) => {
  return `/company/${companyId}`;
};

const operatorDailyReport = (operatorDailyReportId: string) => {
  return `/operator-daily-report/${operatorDailyReportId}`;
};

const vehicleIssue = (vehicleIssueId: string) => {
  return `/vehicle-issue/${vehicleIssueId}`;
};

const server_dailyReportExcelDownload = (dailyReportId: string) => {
  return `${(process.env.NEXT_PUBLIC_API_URL as string).replace(
    "/graphql",
    ""
  )}/file/daily-report/${dailyReportId}`;
};

const server_crewDailyReportMonthExcelDownload = (
  crewId: string,
  dateString: string
) => {
  return `${(process.env.NEXT_PUBLIC_API_URL as string).replace(
    "/graphql",
    ""
  )}/file/crew/${crewId}?start_of_month=${dateString}`;
};

const server_vehiclesExcelDownload = () => {
  return `${(process.env.NEXT_PUBLIC_API_URL as string).replace(
    "/graphql",
    ""
  )}/file/vehicles`;
};

const server_employeesExcelDownload = () => {
  return `${(process.env.NEXT_PUBLIC_API_URL as string).replace(
    "/graphql",
    ""
  )}/file/employees`;
};

const server_operatorDailyReportDownloadPDF = (operatorDailyReportId: string) => {
  return `${(process.env.NEXT_PUBLIC_API_URL as string).replace(
    "/graphql",
    ""
  )}/file/operator-daily-report/${operatorDailyReportId}/pdf`;
}

const createLink = {
  employee,
  vehicle,
  vehicleOperatorDailyReportCreate,
  crew,
  company,
  jobsite,
  jobsiteDailyReports,
  jobsiteMonthReport,
  jobsiteYearReport,
  jobsiteYearMasterReport,
  dailyReport,
  operatorDailyReport,
  vehicleIssue,
  server_dailyReportExcelDownload,
  server_crewDailyReportMonthExcelDownload,
  server_vehiclesExcelDownload,
  server_employeesExcelDownload,
  server_operatorDailyReportDownloadPDF
};

export default createLink;
