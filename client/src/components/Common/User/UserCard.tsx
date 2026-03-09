import { Box, Heading, Text } from "@chakra-ui/react";
import { UserCardSnippetFragment, UserRoles } from "../../../generated/graphql";
import UserUpdateRole from "../../Forms/User/Role";
import UserUpdateTypes from "../../Forms/User/Types";
import Card from "../Card";
import TextGrid from "../TextGrid";

interface IUserCard {
  user: UserCardSnippetFragment;
}

const UserCard = ({ user }: IUserCard) => {
  return (
    <Card heading={<Heading size="md">{user.name}</Heading>}>
      <Box>
        <TextGrid
          rows={[
            { title: <Text fontWeight="bold">Email: </Text>, text: user.email },
            {
              title: <Text fontWeight="bold">Role: </Text>,
              text: <UserUpdateRole user={user} />,
              permission: UserRoles.Admin,
            },
            {
              title: <Text fontWeight="bold">Type: </Text>,
              text: <UserUpdateTypes user={user} />,
              permission: UserRoles.Admin,
            },
          ]}
        />
      </Box>
    </Card>
  );
};

export default UserCard;
