import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import { useSystem } from "../../../../contexts/System";
import {
  JobsiteTruckingRatesSnippetFragment,
  useJobsiteSetAllEmptyTruckingRatesMutation,
  useJobsitesTruckingRateQuery,
} from "../../../../generated/graphql";
import jobsiteName from "../../../../utils/jobsiteName";
import AlertDialog from "../../../Common/AlertDialog";
import TextField from "../../../Common/forms/TextField";
import Loading from "../../../Common/Loading";
import Permission from "../../../Common/Permission";
import PleaseWait from "../../../Common/PleaseWait";
import SystemMaterialShipmentVehicleTypeDefaults from "../../../Common/System/MaterialShipmentVehicleTypeDefaults";
import TruckingRates from "../../jobsite/id/views/TruckingRates";

const JobsiteTruckingRateSettingsClientContent = () => {
  /**
   * ----- Hook Initialization -----
   */

  const router = useRouter();

  const { isOpen, onOpen, onClose } = useDisclosure();

  const [jobsites, setJobsites] = React.useState<
    JobsiteTruckingRatesSnippetFragment[]
  >([]);

  const [searchString, setSearchString] = React.useState("");

  const [searchTimeout, setSearchTimeout] = React.useState<NodeJS.Timeout>();

  const {
    state: { system },
  } = useSystem();

  const { data, loading } = useJobsitesTruckingRateQuery({
    variables: {
      options: {
        pageLimit: 99999,
      },
    },
  });

  const [setAll, { loading: setAllLoading }] =
    useJobsiteSetAllEmptyTruckingRatesMutation();

  /**
   * ----- Functions -----
   */

  const filterList = React.useCallback(() => {
    if (searchString) {
      setJobsites(
        data?.jobsites.filter((jobsite) =>
          jobsiteName(jobsite.name, jobsite.jobcode)
            .toLowerCase()
            .match(searchString.toLowerCase())
        ) || []
      );
    } else if (data?.jobsites) setJobsites(data?.jobsites);
    else return setJobsites([]);
  }, [data?.jobsites, searchString]);

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setSearchString(value);
      if (searchTimeout) clearTimeout(searchTimeout);
      setSearchTimeout(
        setTimeout(() => {
          filterList();
        }, 500)
      );
    },
    [filterList, searchTimeout]
  );

  /**
   * ----- Variables -----
   */

  React.useEffect(() => {
    if (data?.jobsites && !loading) filterList();
  }, [data?.jobsites, filterList, loading, searchString]);

  /**
   * ----- Rendering -----
   */

  if (system) {
    return (
      <Permission showError>
        {setAllLoading && <PleaseWait mb={2} />}
        <Flex justifyContent="space-between">
          <Heading>Trucking Rates Management</Heading>
          <Button
            onClick={() => onOpen()}
            isLoading={setAllLoading}
            backgroundColor="gray.200"
          >
            Fill all empty Rates
          </Button>
        </Flex>
        <SystemMaterialShipmentVehicleTypeDefaults
          system={system}
          onPropogationSuccess={() => router.reload()}
          showEditAllLink
        />
        <Box backgroundColor="gray.200" p={2} borderRadius={4}>
          <Flex flexDir="row" justifyContent="space-between">
            <Heading size="md">Jobsite Trucking Rates</Heading>
            <Box w="25%">
              <TextField
                value={searchString}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search"
              />
            </Box>
          </Flex>
          <Box minH="80vh" maxH="80vh" overflowY="scroll" p={2} mt={2}>
            {loading ? (
              <Loading />
            ) : (
              jobsites.map((jobsite) => (
                <TruckingRates
                  jobsite={jobsite}
                  displayJobsiteName
                  defaultCollapsed
                  key={jobsite._id}
                />
              ))
            )}
          </Box>
        </Box>
        <AlertDialog
          isOpen={isOpen}
          onClose={onClose}
          header="Are you sure?"
          body={
            <Text>
              This will set all empty jobsite trucking rate to the default. This
              action <strong>cannot</strong> be reversed and will have to be{" "}
              <strong>manually</strong> changed if necessary.
            </Text>
          }
          footer={
            <HStack spacing={2}>
              <Button onClick={() => onClose()}>Cancel</Button>
              <Button
                colorScheme="red"
                onClick={() => {
                  onClose();
                  setAll().then(() => {
                    router.reload();
                  });
                }}
              >
                Fill
              </Button>
            </HStack>
          }
        />
      </Permission>
    );
  } else return <Loading />;
};

export default JobsiteTruckingRateSettingsClientContent;
