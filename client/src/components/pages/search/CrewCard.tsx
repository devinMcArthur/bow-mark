import { Flex, Icon } from "@chakra-ui/react";
import { FiUsers } from "react-icons/fi";
import { CrewCardSnippetFragment } from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import Card from "../../Common/Card";
import TextLink from "../../Common/TextLink";

interface ICrewSearchCard {
  crew: CrewCardSnippetFragment;
}

const CrewSearchCard = ({ crew }: ICrewSearchCard) => {
  return (
    <Card>
      <Flex flexDir="row" justifyContent="space-between">
        <TextLink
          fontSize="lg"
          fontWeight="bold"
          link={createLink.crew(crew._id)}
        >
          {crew.name}
        </TextLink>
        <Icon as={FiUsers} />
      </Flex>
    </Card>
  );
};

export default CrewSearchCard;
