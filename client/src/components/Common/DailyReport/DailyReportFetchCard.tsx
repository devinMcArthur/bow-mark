import { Text } from "@chakra-ui/react";
import React from "react";
import { useDailyReportCardQuery } from "../../../generated/graphql";
import Card from "../Card";
import Loading from "../Loading";
import DailyReportCard from "./DailyReportCard";

interface IDailyReportFetchCard {
  dailyReportId: string;
}

const DailyReportFetchCard = ({ dailyReportId }: IDailyReportFetchCard) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading } = useDailyReportCardQuery({
    variables: {
      id: dailyReportId,
    },
  });

  return React.useMemo(() => {
    if (data?.dailyReport && !loading) {
      return <DailyReportCard dailyReport={data.dailyReport} />;
    } else {
      return (
        <Card
          heading={
            <Text color="black" fontWeight="bold" fontSize="lg">
              Daily Report #{dailyReportId}
            </Text>
          }
        >
          <Loading />
        </Card>
      );
    }
  }, [dailyReportId, data?.dailyReport, loading]);
};

export default DailyReportFetchCard;
