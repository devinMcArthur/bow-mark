import { Flex, Icon, Text } from "@chakra-ui/react";
import { FiMap } from "react-icons/fi";
import createLink from "../../../utils/createLink";
import Card from "../../Common/Card";
import TextLink from "../../Common/TextLink";

interface IJobsiteSearchCard {
  jobsite: {
    _id: string;
    name: string;
    jobcode?: string | null;
  };
}

const JobsiteSearchCard = ({ jobsite }: IJobsiteSearchCard) => {
  return (
    <Card
      heading={
        <Flex flexDir="row" justifyContent="space-between">
          <TextLink
            fontSize="lg"
            fontWeight="bold"
            link={createLink.jobsite(jobsite._id)}
          >
            {jobsite.name}
          </TextLink>
          <Icon as={FiMap} />
        </Flex>
      }
    >
      <Text>
        <Text fontWeight="bold" as="span">
          Job Code:{" "}
        </Text>
        {jobsite.jobcode}
      </Text>
    </Card>
  );
};

export default JobsiteSearchCard;
