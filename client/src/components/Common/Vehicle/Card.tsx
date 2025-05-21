import React from "react";
import { Text, Flex, IconButton, Tooltip } from "@chakra-ui/react";
import {
  ArchivedVehiclesDocument,
  UserRoles,
  useVehicleArchiveMutation,
  useVehicleUnarchiveMutation,
  VehicleCardSnippetFragment,
  VehiclesDocument,
} from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import Card from "../Card";
import TextGrid from "../TextGrid";
import TextLink from "../TextLink";
import Permission from "../Permission";
import { FiArchive, FiUnlock } from "react-icons/fi";

interface IVehicleCard {
  vehicle: VehicleCardSnippetFragment;
}

const VehicleCard = ({ vehicle }: IVehicleCard) => {
  /**
   * ----- Hook Initialization -----
   */

  const [archive, { loading: archiveLoading, data }] =
    useVehicleArchiveMutation({
      refetchQueries: [VehiclesDocument, ArchivedVehiclesDocument],
    });

  const [unarchive, { loading: unarchiveLoading, data: unarchiveData }] =
    useVehicleUnarchiveMutation({
      refetchQueries: [VehiclesDocument, ArchivedVehiclesDocument],
    });

  /**
   * ----- Variables -----
   */

  const currentRate = React.useMemo(() => {
    if (vehicle.rates.length > 0) {
      return vehicle.rates[vehicle.rates.length - 1].rate;
    } else {
      return 0;
    }
  }, [vehicle]);

  /**
   * ----- Rendering -----
   */

  return (
    <Card
      filter={
        data?.vehicleArchive._id || unarchiveData?.vehicleUnarchive._id
          ? "blur(3px)"
          : ""
      }
      heading={
        <Flex flexDir="row" justifyContent="space-between">
          <TextLink
            link={createLink.vehicle(vehicle._id)}
            color="black"
            fontWeight="bold"
            fontSize="lg"
          >
            {vehicle.name}
          </TextLink>
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
            </Flex>
          </Permission>
        </Flex>
      }
    >
      <TextGrid
        rows={[
          {
            title: <Text fontWeight="bold">Code: </Text>,
            text: vehicle.vehicleCode,
          },
          {
            title: <Text fontWeight="bold">Type: </Text>,
            text: vehicle.vehicleType,
          },
          {
            title: <Text fontWeight="bold">Current Rate: </Text>,
            text: `$${currentRate}`,
          }
        ]}
      />
    </Card>
  );
};

export default VehicleCard;
