import { Box, Center, Stack } from "@chakra-ui/react";
import React from "react";
import { useDailyReportsForJobsiteQuery } from "../../../../generated/graphql";
import InfiniteScroll from "../../../Common/InfiniteScroll";
import Loading from "../../../Common/Loading";
import DailyReportClientContent from "../../daily-reports/id/ClientContent";

interface IJobsiteDailyReportsClientContent {
  jobsiteId: string;
}

const JobsiteDailyReportsClientContent = ({
  jobsiteId,
}: IJobsiteDailyReportsClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, fetchMore, networkStatus } = useDailyReportsForJobsiteQuery({
    variables: {
      jobsiteId,
      options: {
        pageLimit: 2,
      },
    },
    notifyOnNetworkStatusChange: true,
  });

  const [finished, setFinished] = React.useState(false);

  /**
   * ----- Functions -----
   */

  const nextPage = React.useCallback(() => {
    if (!finished && networkStatus === 7) {
      fetchMore({
        variables: {
          jobsiteId,
          options: {
            offset: data?.dailyReportsForJobsite.length,
            pageLimit: 1,
          },
        },
      }).then((data) => {
        if (data.data.dailyReportsForJobsite.length === 0) setFinished(true);
      });
    }
  }, [
    data?.dailyReportsForJobsite.length,
    fetchMore,
    finished,
    jobsiteId,
    networkStatus,
  ]);

  /**
   * ----- Rendering -----
   */

  const content = React.useMemo(() => {
    if (data?.dailyReportsForJobsite) {
      return (
        <Stack spacing={4}>
          {data.dailyReportsForJobsite.map((dailyReport) => (
            <Box
              key={dailyReport._id}
              borderRadius={4}
              backgroundColor="gray.300"
              p={4}
            >
              <DailyReportClientContent id={dailyReport._id} />
            </Box>
          ))}
          {networkStatus !== 7 && (
            <Center pt={4}>
              <Loading />
            </Center>
          )}
        </Stack>
      );
    } else return <Loading />;
  }, [data?.dailyReportsForJobsite, networkStatus]);

  return (
    <InfiniteScroll
      enabled={
        !!data?.dailyReportsForJobsite && data.dailyReportsForJobsite.length > 0
      }
      loading={networkStatus !== 7}
      content={content}
      nextPage={() => nextPage()}
    />
  );
};

export default JobsiteDailyReportsClientContent;
