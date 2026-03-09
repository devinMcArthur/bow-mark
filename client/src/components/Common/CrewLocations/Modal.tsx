import {
  Flex,
  Grid,
  GridItem,
  IconButton,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { FiCheck, FiDownload } from "react-icons/fi";
import {
  useCrewLocationsExcelLazyQuery,
  useCrewLocationsLazyQuery,
} from "../../../generated/graphql";
import TextField from "../forms/TextField";
import Loading from "../Loading";
import CrewLocationsTable from "./Table";

interface ICrewLocationsModal {
  isOpen: boolean;
  onClose: () => void;
}

const CrewLocationsModal = ({ isOpen, onClose }: ICrewLocationsModal) => {
  /**
   * ----- Hook Initialization -----
   */

  const [startTime, setStartTime] = React.useState(
    dayjs().startOf("month").toDate()
  );
  const [endTime, setEndTime] = React.useState(dayjs().toDate());

  const [query, { data, loading, variables }] = useCrewLocationsLazyQuery();

  const [excelQuery, { data: excelData, loading: excelLoading }] =
    useCrewLocationsExcelLazyQuery();

  /**
   * ----- Functions -----
   */

  const handleDateSubmit = () => {
    query({
      variables: {
        startTime,
        endTime,
      },
    });
    excelQuery({
      variables: {
        startTime,
        endTime,
      },
    });
  };

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (isOpen) {
      query({
        variables: {
          startTime: startTime,
          endTime: endTime,
        },
      });
      excelQuery({
        variables: {
          startTime,
          endTime,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /**
   * ----- Render -----
   */

  return (
    <Modal size="full" isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex justifyContent="space-between">
            <Flex flexDir="row" my="auto">
              Crew Location Report
              <Link
                passHref
                href={excelData?.crewLocationsExcel}
                download={`Crew-Locations-${dayjs(startTime).format(
                  "YYYY-MM-DD"
                )}-${dayjs(endTime).format("YYYY-MM-DD")}`}
              >
                <IconButton
                  mx={2}
                  isLoading={excelLoading}
                  icon={<FiDownload />}
                  aria-label="download"
                  backgroundColor="transparent"
                />
              </Link>
            </Flex>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDateSubmit();
              }}
            >
              <Grid
                templateColumns="repeat(10, 1fr)"
                templateRows="repeat(1, 1fr)"
                gap={2}
                mr={2}
              >
                <GridItem colStart={[0, 0, 0, 6]} colSpan={[4, 4, 4, 2]}>
                  <TextField
                    label="Start Time"
                    type="date"
                    name="startTime"
                    value={startTime.toISOString().split("T")[0]}
                    onChange={(e) => {
                      if (
                        new Date(e.target.value).toString() !== "Invalid Date"
                      ) {
                        setStartTime(
                          dayjs(e.target.value).startOf("day").toDate()
                        );
                      }
                    }}
                  />
                </GridItem>
                <GridItem colSpan={[4, 4, 4, 2]}>
                  <TextField
                    label="End Time"
                    type="date"
                    name="endTime"
                    value={endTime.toISOString().split("T")[0]}
                    onChange={(e) => {
                      if (
                        new Date(e.target.value).toString() !== "Invalid Date"
                      ) {
                        setEndTime(
                          dayjs(e.target.value).startOf("day").toDate()
                        );
                      }
                    }}
                  />
                </GridItem>
                <GridItem colspan={[1, 1, 1, 1]}>
                  <IconButton
                    icon={<FiCheck />}
                    type="submit"
                    aria-label="submit"
                    backgroundColor="transparent"
                    onClick={handleDateSubmit}
                  />
                </GridItem>
              </Grid>
            </form>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {data?.crewLocations && variables && !loading ? (
            <CrewLocationsTable
              startTime={variables.startTime}
              endTime={variables.endTime}
              locations={data.crewLocations}
            />
          ) : (
            <Loading />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CrewLocationsModal;
