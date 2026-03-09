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
import Breadcrumbs from "../components/Common/Breadcrumbs";
import Container from "../components/Common/Container";
import DailyReportCard from "../components/Common/DailyReport/DailyReportCard";
import DailyReportFullPageList from "../components/Common/DailyReport/ListFullPage";
import InfiniteScroll from "../components/Common/InfiniteScroll";
import Loading from "../components/Common/Loading";
import { useAuth } from "../contexts/Auth";
import {
  DailyReportListFilter,
  useDailyReportsLazyQuery,
  UserRoles,
} from "../generated/graphql";

const DailyReports = () => {
  /**
   * ----- Hook Initialization -----
   */

  const {
    state: { user },
  } = useAuth();

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

  const content = React.useMemo(() => {
    if (data?.dailyReports) {
      return (
        <Box>
          <Flex flexDir="row" justifyContent="space-between">
            <Breadcrumbs
              crumbs={[
                {
                  title: "Daily Reports",
                  isCurrentPage: true,
                },
              ]}
            />
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
  }, [data?.dailyReports, filters, handleFilterChange, loading]);

  return (
    <Container>
      <DailyReportFullPageList />
    </Container>
  );
};

export default DailyReports;
