import { Heading } from "@chakra-ui/react";
import Card from "../Card";
import ShowMore from "../ShowMore";
import DailyReportFetchCard from "./DailyReportFetchCard";

interface IDailyReportFetchListCard {
  dailyReportIds: string[];
  limit?: number;
}

const DailyReportFetchListCard = ({
  dailyReportIds,
  limit,
}: IDailyReportFetchListCard) => {
  return (
    <Card>
      <Heading ml={2} my="auto" size="md" w="100%">
        Daily Reports ({dailyReportIds.length})
      </Heading>
      <ShowMore
        limit={limit}
        list={dailyReportIds.map((id) => (
          <DailyReportFetchCard key={id} dailyReportId={id} />
        ))}
      />
    </Card>
  );
};

export default DailyReportFetchListCard;
