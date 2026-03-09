import {
  Box,
  Flex,
  Heading,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
} from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { FiEdit } from "react-icons/fi";
import ClientOnly from "../../components/Common/ClientOnly";
import Container from "../../components/Common/Container";
import Permission from "../../components/Common/Permission";
import EmployeeUpdateForm from "../../components/Forms/Employee/Update";
import EmployeeClientContent from "../../components/pages/employee/ClientContent";
import { UserRoles } from "../../generated/graphql";
import { PageEmployeeSsrComp, ssrEmployeeSsr } from "../../generated/page";
import Breadcrumbs from "../../components/Common/Breadcrumbs";

const Employee: PageEmployeeSsrComp = ({ data }) => {
  const employee = data?.employee!;

  /**
   * ----- Hook Initialization -----
   */

  const router = useRouter();

  const { isOpen, onOpen, onClose } = useDisclosure();

  /**
   * ----- Rendering -----
   */

  return (
    <Container>
      <Breadcrumbs
        crumbs={[
          {
            title: "Employees",
            link: "/employees",
          },
          {
            title: employee.name,
            isCurrentPage: true,
          },
        ]}
      />
      <Flex flexDir="row" justifyContent="space-between">
        <Box>
          <Heading>{employee.name}</Heading>
          <Heading size="md" color="gray.600">
            {employee.jobTitle}
          </Heading>
        </Box>
        <Permission minRole={UserRoles.Admin}>
          <IconButton
            aria-label="edit"
            backgroundColor="transparent"
            icon={<FiEdit />}
            onClick={() => onOpen()}
          />
        </Permission>
      </Flex>
      <ClientOnly>
        <EmployeeClientContent id={employee._id} />
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Employee Edit</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <EmployeeUpdateForm
                employee={employee}
                onSuccess={() => {
                  onClose();
                  router.reload();
                }}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </ClientOnly>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  ...ctx
}) => {
  const res = await ssrEmployeeSsr.getServerPage(
    { variables: { id: params?.id as string } },
    ctx
  );

  let notFound = false;
  if (!res.props.data.employee) notFound = true;

  return { ...res, notFound };
};

export default Employee;
