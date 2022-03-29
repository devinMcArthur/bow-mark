import { Flex, Heading } from "@chakra-ui/react";
import React from "react";
import Card from "../components/Common/Card";
import Container from "../components/Common/Container";
import InfiniteScroll from "../components/Common/InfiniteScroll";
import Loading from "../components/Common/Loading";

import { useCompaniesQuery } from "../generated/graphql";

const Companies = () => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading, fetchMore } = useCompaniesQuery();

  const [finished, setFinished] = React.useState(false);

  /**
   * ----- Functions -----
   */

  const nextPage = React.useCallback(() => {
    if (!finished && !loading) {
      fetchMore({
        variables: {
          options: {
            offset: data?.companies.length,
          },
        },
      }).then((data) => {
        if (data.data.companies.length === 0) setFinished(true);
      });
    }
  }, [data?.companies.length, fetchMore, finished, loading]);

  /**
   * ----- Rendering -----
   */

  const content = React.useMemo(() => {
    if (data?.companies) {
      return (
        <Flex flexDir="column" alignContent="center">
          {data.companies.map((company) => (
            <Card key={company._id}>
              <Heading size="md">{company.name}</Heading>
            </Card>
          ))}
          {loading && <Loading />}
        </Flex>
      );
    } else {
      return <Loading />;
    }
  }, [data?.companies, loading]);

  return (
    <Container>
      <Heading>Companies</Heading>
      <InfiniteScroll content={content} nextPage={nextPage} />
    </Container>
  );
};

export default Companies;
