import {
  Flex,
  Heading,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { FiArchive, FiEdit, FiUnlock } from "react-icons/fi";
import ClientOnly from "../../components/Common/ClientOnly";
import Container from "../../components/Common/Container";
import Permission from "../../components/Common/Permission";
import VehicleUpdateForm from "../../components/Forms/Vehicle/Update";
import VehicleClientContent from "../../components/pages/vehicle/ClientContent";
import {
  ArchivedVehiclesDocument,
  UserRoles,
  useVehicleArchiveMutation,
  useVehicleUnarchiveMutation,
  VehiclesDocument,
} from "../../generated/graphql";
import { PageVehicleSsrComp, ssrVehicleSsr } from "../../generated/page";
import Breadcrumbs from "../../components/Common/Breadcrumbs";

const Vehicle: PageVehicleSsrComp = ({ data }) => {
  const vehicle = data?.vehicle!;

  /**
   * ----- Hook Initialization -----
   */

  const router = useRouter();

  const { isOpen, onOpen, onClose } = useDisclosure();

  const [archive, { loading: archiveLoading }] = useVehicleArchiveMutation();

  const [unarchive, { loading: unarchiveLoading }] =
    useVehicleUnarchiveMutation({
      refetchQueries: [VehiclesDocument, ArchivedVehiclesDocument],
    });

  /**
   * ----- Rendering -----
   */

  return (
    <Container>
      <Breadcrumbs
        crumbs={[
          {
            title: "Vehicles",
            link: "/vehicles",
          },
          {
            title: vehicle.name,
            isCurrentPage: true,
          },
        ]}
      />

      <Flex flexDir="row" justifyContent="space-between">
        <Heading>
          {vehicle.name} ({vehicle.vehicleCode})
        </Heading>
        <Permission minRole={UserRoles.Admin}>
          <Flex flexDir="row">
            {!vehicle.archivedAt ? (
              <Tooltip label="Archive">
                <IconButton
                  aria-label="archive"
                  backgroundColor="transparent"
                  icon={<FiArchive />}
                  isLoading={archiveLoading}
                  onClick={() => {
                    if (window.confirm("Are you sure?"))
                      archive({
                        variables: {
                          id: vehicle._id,
                        },
                      });
                  }}
                />
              </Tooltip>
            ) : (
              <Tooltip label="Unarchive">
                <IconButton
                  aria-label="unarchive"
                  backgroundColor="transparent"
                  icon={<FiUnlock />}
                  isLoading={unarchiveLoading}
                  onClick={() => {
                    if (window.confirm("Are you sure?"))
                      unarchive({
                        variables: {
                          id: vehicle._id,
                        },
                      });
                  }}
                />
              </Tooltip>
            )}
            <IconButton
              aria-label="edit"
              backgroundColor="transparent"
              icon={<FiEdit />}
              onClick={() => onOpen()}
            />
          </Flex>
        </Permission>
      </Flex>
      <ClientOnly>
        <VehicleClientContent id={vehicle._id} />
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Vehicle Edit</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VehicleUpdateForm
                vehicle={vehicle}
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
  const res = await ssrVehicleSsr.getServerPage(
    { variables: { id: params?.id as string } },
    ctx
  );

  let notFound = false;
  if (!res.props.data.vehicle) notFound = true;

  return { ...res, notFound };
};

export default Vehicle;
