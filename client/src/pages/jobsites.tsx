import { Box, Center, Flex } from "@chakra-ui/react";
import React from "react";
import Breadcrumbs from "../components/Common/Breadcrumbs";
import Container from "../components/Common/Container";
import InfiniteScroll from "../components/Common/InfiniteScroll";
import JobsiteCard from "../components/Common/Jobsite/Card";
import Loading from "../components/Common/Loading";
import { useJobsitesQuery } from "../generated/graphql";

const Jobsites = () => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading, fetchMore, networkStatus } = useJobsitesQuery({
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
            offset: data?.jobsites.length,
          },
        },
      }).then((data) => {
        if (data.data.jobsites.length === 0) setFinished(true);
      });
    }
  }, [data?.jobsites.length, fetchMore, finished, networkStatus]);

  /**
   * ----- Rendering -----
   */

  const content = React.useMemo(() => {
    if (data?.jobsites) {
      return (
        <Box>
          <Breadcrumbs
            crumbs={[
              {
                title: "Jobsites",
                isCurrentPage: true,
              },
            ]}
          />
          <Flex flexDir="column" alignContent="center" id="pages-flex">
            {data.jobsites.map((jobsite) => (
              <JobsiteCard jobsite={jobsite} key={jobsite._id} />
            ))}
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
  }, [data?.jobsites, loading]);

  return (
    <Container>
      <InfiniteScroll
        enabled={!!data?.jobsites && data.jobsites.length > 0}
        loading={networkStatus !== 7}
        content={content}
        nextPage={nextPage}
      />
    </Container>
  );
};

export default Jobsites;
