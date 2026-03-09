import { Flex, Heading, IconButton } from "@chakra-ui/react";
import React from "react";
import { FiEdit, FiX } from "react-icons/fi";
import { EmployeeFullSnippetFragment } from "../../../../generated/graphql";
import Card from "../../../Common/Card";
import RatesTable from "../../../Common/RatesTable";
import EmployeeRateUpdate from "../../../Forms/Employee/EmployeeRateUpdate";

interface IEmployeeRates {
  employee: EmployeeFullSnippetFragment;
}

const EmployeeRates = ({ employee }: IEmployeeRates) => {
  /**
   * ------ Hook Initialization -----
   */

  const [edit, setEdit] = React.useState(false);

  /**
   * ----- Rendering -----
   */

  return (
    <Card>
      <Flex flexDir="row" justifyContent="space-between">
        <Heading size="md">Rates</Heading>
        <IconButton
          aria-label="edit"
          icon={edit ? <FiX /> : <FiEdit />}
          backgroundColor="transparent"
          onClick={() => setEdit(!edit)}
        />
      </Flex>
      <RatesTable rates={employee.rates} />
      {edit && (
        <EmployeeRateUpdate
          employee={employee}
          onSuccess={() => setEdit(false)}
        />
      )}
    </Card>
  );
};

export default EmployeeRates;
