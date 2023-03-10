import React from "react";

import { Box, Center, Flex } from "@chakra-ui/react";
import { useOperatorDailyReportsLazyQuery } from "../../../generated/graphql";
import Breadcrumbs from "../Breadcrumbs";
import InfiniteScroll from "../InfiniteScroll";
import Loading from "../Loading";
import OperatorDailyReportCard from "./OperatorDailyReportCard";

interface IOperatorDailyReportFullPageList {
  hideBreadcrumbs?: boolean;
}

const OperatorDailyReportFullPageList = ({
  hideBreadcrumbs = false,
}: IOperatorDailyReportFullPageList) => {
  /**
   * --- Hook Initialization ---
   */

  const [fetch, { data, loading, fetchMore, networkStatus }] =
    useOperatorDailyReportsLazyQuery({
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
          options: {
            offset: data?.operatorDailyReports.length,
          },
        },
      }).then((data) => {
        if (data.data.operatorDailyReports.length === 0) setFinished(true);
      });
    }
  }, [data?.operatorDailyReports.length, fetchMore, finished, networkStatus]);

  /**
   * --- Lifecycle ---
   */

  React.useEffect(() => {
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * --- Rendering ---
   */

  const content = React.useMemo(() => {
    if (data?.operatorDailyReports) {
      return (
        <Box>
          <Flex flexDir="row" justifyContent="space-between">
            <Box>
              {hideBreadcrumbs ? null : (
                <Breadcrumbs
                  crumbs={[
                    {
                      title: "Operator Daily Reports",
                      isCurrentPage: true,
                    },
                  ]}
                />
              )}
            </Box>
          </Flex>
          <Flex flexDir="column" alignContent="center" id="pages-flex">
            {data.operatorDailyReports.map((operatorDailyReport) => {
              return (
                <OperatorDailyReportCard
                  operatorDailyReport={operatorDailyReport}
                  key={operatorDailyReport._id}
                />
              );
            })}
            {loading && (
              <Center pt={4}>
                <Loading />
              </Center>
            )}
          </Flex>
        </Box>
      );
    } else {
      return <Loading />;
    }
  }, [data?.operatorDailyReports, hideBreadcrumbs, loading]);

  return (
    <InfiniteScroll
      enabled={
        !!data?.operatorDailyReports && data.operatorDailyReports.length > 0
      }
      loading={networkStatus !== 7}
      content={content}
      nextPage={() => nextPage()}
    />
  );
};

export default OperatorDailyReportFullPageList;
