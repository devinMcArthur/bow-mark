import { Box, Flex, IconButton, Text } from "@chakra-ui/react";
import { FiTrash } from "react-icons/fi";
import {
  CrewFullSnippetFragment,
  EmployeeCardSnippetFragment,
  Scalars,
  useCrewRemoveEmployeeMutation,
} from "../../../../../generated/graphql";
import createLink from "../../../../../utils/createLink";
import EmployeeHours from "../../../../Common/Employee/Hours";
import TextLink from "../../../../Common/TextLink";

interface IEmployeeCard {
  employee: EmployeeCardSnippetFragment;
  crew: CrewFullSnippetFragment;
  showHours?: boolean;
  hoursTimeRange?: {
    startTime: Scalars["DateTime"];
    endTime: Scalars["DateTime"];
  };
}

const EmployeeCard = ({
  employee,
  crew,
  hoursTimeRange,
  showHours = false,
}: IEmployeeCard) => {
  const [remove, { loading: removeLoading }] = useCrewRemoveEmployeeMutation({
    variables: {
      crewId: crew._id,
      employeeId: employee._id,
    },
  });

  return (
    <Box p={2} w="100%" border="1px solid lightgray">
      <Flex flexDir="row" justifyContent="space-between">
        <Box>
          <TextLink link={createLink.employee(employee._id)} fontWeight="bold">
            {employee.name}
          </TextLink>
          <Text>{employee.jobTitle}</Text>
        </Box>
        <IconButton
          onClick={() => window.confirm("Are you sure?") && remove()}
          isLoading={removeLoading}
          backgroundColor="transparent"
          aria-label="remove"
          icon={<FiTrash />}
        />
      </Flex>
      {showHours && (
        <EmployeeHours
          startTime={hoursTimeRange?.startTime}
          endTime={hoursTimeRange?.endTime}
          employeeId={employee._id}
        />
      )}
    </Box>
  );
};

export default EmployeeCard;
