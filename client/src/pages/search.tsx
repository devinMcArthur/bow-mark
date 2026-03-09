import { GetServerSideProps } from "next";
import React from "react";
import Card from "../components/Common/Card";

import Container from "../components/Common/Container";
import DailyReportCard from "../components/Common/DailyReport/DailyReportCard";
import CrewSearchCard from "../components/pages/search/CrewCard";
import EmployeeSearchCard from "../components/pages/search/EmployeeCard";
import JobsiteSearchCard from "../components/pages/search/JobsiteCard";
import VehicleSearchCard from "../components/pages/search/VehicleCard";
import CompanySearchCard from "../components/pages/search/CompanyCard";
import { PageSearchComp, ssrSearch } from "../generated/page";

const Search: PageSearchComp = ({ data }) => {
  const results = data?.search!;

  /**
   * ----- Rendering -----
   */

  const list = React.useMemo(() => {
    return results.map((result, index) => {
      if (result.employee) {
        return <EmployeeSearchCard key={index} employee={result.employee} />;
      } else if (result.vehicle) {
        return <VehicleSearchCard key={index} vehicle={result.vehicle} />;
      } else if (result.jobsite) {
        return <JobsiteSearchCard key={index} jobsite={result.jobsite} />;
      } else if (result.dailyReport) {
        return <DailyReportCard key={index} dailyReport={result.dailyReport} />;
      } else if (result.crew) {
        return <CrewSearchCard key={index} crew={result.crew} />;
      } else if (result.company) {
        return <CompanySearchCard key={index} company={result.company} />;
      } else {
        return <Card key={index}>Error</Card>;
      }
    });
  }, [results]);

  return <Container>{list}</Container>;
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  ...ctx
}) => {
  const res = await ssrSearch.getServerPage(
    { variables: { searchString: ctx.query.search_string as string } },
    ctx
  );

  return { ...res };
};

export default Search;
