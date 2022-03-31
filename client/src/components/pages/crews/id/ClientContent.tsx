import React from "react";

import { Stack } from "@chakra-ui/react";
import Employees from "./views/Employees";
import Vehicles from "./views/Vehicles";
import { useCrewFullQuery } from "../../../../generated/graphql";
import Loading from "../../../Common/Loading";
import DailyReportListCard from "../../../Common/DailyReport/DailyReportListCard";
import DailyReportFetchListCard from "../../../Common/DailyReport/DailyReportFetchListCard";

interface ICrewClientContent {
  id: string;
}

const CrewClientContent = ({ id }: ICrewClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data } = useCrewFullQuery({
    variables: {
      id,
    },
  });

  /**
   * ----- Rendering -----
   */

  return React.useMemo(() => {
    if (data?.crew) {
      const { crew } = data;

      return (
        <Stack spacing={2}>
          <Employees employees={crew.employees} crew={crew} />
          <Vehicles vehicles={crew.vehicles} crew={crew} />

          <DailyReportFetchListCard
            limit={15}
            dailyReportIds={crew.dailyReports.map((report) => report._id)}
          />
        </Stack>
      );
    } else return <Loading />;
  }, [data]);
};

export default CrewClientContent;
