import React from "react";

import { Stack } from "@chakra-ui/react";
import Employees from "./views/Employees";
import Vehicles from "./views/Vehicles";
import { useCrewFullQuery, UserRoles } from "../../../../generated/graphql";
import Loading from "../../../Common/Loading";
import DailyReportFetchListCard from "../../../Common/DailyReport/DailyReportFetchListCard";
import Permission from "../../../Common/Permission";
import { useAuth } from "../../../../contexts/Auth";

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

  const {
    state: { user },
  } = useAuth();

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
          <Permission
            minRole={UserRoles.ProjectManager}
            otherCriteria={user?.employee.crews
              .map((c) => c._id)
              .includes(crew._id)}
          >
            <DailyReportFetchListCard
              limit={15}
              dailyReportIds={crew.dailyReports.map((report) => report._id)}
            />
          </Permission>
        </Stack>
      );
    } else return <Loading />;
  }, [data, user?.employee.crews]);
};

export default CrewClientContent;
