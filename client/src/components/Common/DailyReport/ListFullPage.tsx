import {
  Box,
  Button,
  Center,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import React from "react";
import { FaChevronDown } from "react-icons/fa";
import { FiCheck } from "react-icons/fi";

import { useAuth } from "../../../contexts/Auth";
import {
  DailyReportListFilter,
  useDailyReportsLazyQuery,
  UserRoles,
} from "../../../generated/graphql";
import Breadcrumbs from "../Breadcrumbs";
import InfiniteScroll from "../InfiniteScroll";
import Loading from "../Loading";
import DailyReportCard from "./DailyReportCard";
import { useApolloClient } from "@apollo/client";

interface IDailyReportFullPageList {
  hideBreadcrumbs?: boolean;
}

const DailyReportFullPageList = ({
  hideBreadcrumbs = false,
}: IDailyReportFullPageList) => {
  /**
   * ----- Hook Initialization -----
   */

  const {
    state: { user },
  } = useAuth();

  const client = useApolloClient();

  const crews = React.useMemo(() => {
    if (user) {
      if (user.role === UserRoles.User) {
        return user.employee.crews.map((crew) => crew._id);
      } else return [];
    }
  }, [user]);

  const [fetch, { data, loading, fetchMore, networkStatus, refetch }] =
    useDailyReportsLazyQuery({
      notifyOnNetworkStatusChange: true,
    });

  const [finished, setFinished] = React.useState(false);

  const [filters, setFilters] = React.useState<DailyReportListFilter[]>([]);

  /**
   * ----- Functions -----
   */

  const nextPage = React.useCallback(() => {
    if (!finished && networkStatus === 7) {
      fetchMore({
        variables: {
          options: {
            offset: data?.dailyReports.length,
            crews,
            filters,
          },
        },
      }).then((data) => {
        if (data.data.dailyReports.length === 0) setFinished(true);
      });
    }
  }, [
    crews,
    data?.dailyReports.length,
    fetchMore,
    filters,
    finished,
    networkStatus,
  ]);

  const handleFilterChange = React.useCallback(
    (filter: DailyReportListFilter) => {
      const filterCopy = [...filters];

      if (filterCopy.includes(filter)) {
        const index = filterCopy.findIndex((item) => item === filter);
        if (index !== -1) filterCopy.splice(index, 1);
      } else filterCopy.push(filter);

      setFilters(filterCopy);
    },
    [filters]
  );

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (crews)
      fetch({
        variables: {
          options: {
            crews,
            filters,
          },
        },
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crews]);

  React.useEffect(() => {
    client.cache.evict({ fieldName: "dailyReports" });
    client.cache.gc();
    refetch({
      options: {
        crews,
        filters,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  /**
   * ----- Rendering -----
   */

  const content = (() => {
    if (data?.dailyReports) {
      return (
        <Box>
          <Flex flexDir="row" justifyContent="space-between">
            <Box>
              {hideBreadcrumbs ? null : (
                <Breadcrumbs
                  crumbs={[
                    {
                      title: "Daily Reports",
                      isCurrentPage: true,
                    },
                  ]}
                />
              )}
            </Box>
            <Menu>
              <MenuButton
                disabled={loading}
                as={Button}
                rightIcon={<FaChevronDown />}
              >
                Filters
              </MenuButton>
              <MenuList>
                <MenuItem
                  display="flex"
                  justifyContent="space-between"
                  onClick={() =>
                    handleFilterChange(DailyReportListFilter.NoCostApproval)
                  }
                >
                  Not approved{" "}
                  {filters.includes(DailyReportListFilter.NoCostApproval) ? (
                    <FiCheck />
                  ) : (
                    ""
                  )}
                </MenuItem>
                <MenuItem
                  display="flex"
                  justifyContent="space-between"
                  onClick={() =>
                    handleFilterChange(DailyReportListFilter.NoPayroll)
                  }
                >
                  No payroll{" "}
                  {filters.includes(DailyReportListFilter.NoPayroll) ? (
                    <FiCheck />
                  ) : (
                    ""
                  )}
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
          <Flex flexDir="column" alignContent="center" id="pages-flex">
            {data.dailyReports.map((dailyReport) => {
              return (
                <DailyReportCard
                  dailyReport={dailyReport}
                  key={dailyReport._id}
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
  })();

  return (
    <InfiniteScroll
      enabled={!!data?.dailyReports && data.dailyReports.length > 0}
      loading={networkStatus !== 7}
      content={content}
      nextPage={() => nextPage()}
    />
  );
};

export default DailyReportFullPageList;
