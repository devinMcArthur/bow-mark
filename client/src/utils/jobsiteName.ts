const jobsiteName = (name: string, jobcode?: string | null) => {
  return `${jobcode && `${jobcode} - `}${name}`;
};

export default jobsiteName;
