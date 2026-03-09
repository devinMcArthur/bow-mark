import { Flex, Icon, Text } from "@chakra-ui/react";
import { FiUser } from "react-icons/fi";
import createLink from "../../../utils/createLink";
import Card from "../../Common/Card";
import TextLink from "../../Common/TextLink";

interface IEmployeeSearchCard {
  employee: {
    _id: string;
    name: string;
    jobTitle?: string | null;
  };
}

const EmployeeSearchCard = ({ employee }: IEmployeeSearchCard) => {
  return (
    <Card
      heading={
        <Flex flexDir="row" justifyContent="space-between">
          <TextLink
            fontSize="lg"
            fontWeight="bold"
            link={createLink.employee(employee._id)}
          >
            {employee.name}
          </TextLink>
          <Icon as={FiUser} />
        </Flex>
      }
    >
      <Text>
        <Text fontWeight="bold" as="span">
          Job Title:{" "}
        </Text>
        {employee.jobTitle}
      </Text>
    </Card>
  );
};

export default EmployeeSearchCard;
