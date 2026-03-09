import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import Card from "../components/Common/Card";
import Container from "../components/Common/Container";
import Loading from "../components/Common/Loading";
import TextLink from "../components/Common/TextLink";

import { useAuth } from "../contexts/Auth";
import createLink from "../utils/createLink";

const Me = () => {
  const {
    state: { user },
  } = useAuth();

  const content = React.useMemo(() => {
    if (user) {
      return (
        <Box>
          <Heading>{user.name}</Heading>
          <Card heading={<Text fontWeight="bold">Employee</Text>}>
            <TextLink link={createLink.employee(user.employee._id)}>
              {user.employee.name}
              {!!user.employee.jobTitle && <> - {user.employee.jobTitle}</>}
            </TextLink>
          </Card>
        </Box>
      );
    } else {
      return <Loading />;
    }
  }, [user]);

  return <Container>{content}</Container>;
};

export default Me;
