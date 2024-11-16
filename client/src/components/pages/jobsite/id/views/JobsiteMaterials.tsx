import {
  Box,
  Center,
  Flex,
  Heading,
  HStack,
  IconButton,
} from "@chakra-ui/react";
import React from "react";
import { FiMaximize, FiPlus, FiX } from "react-icons/fi";

import {
  JobsiteFullSnippetFragment,
  useJobsitesMaterialsQuery,
  useJobsitesNonCostedMaterialsLazyQuery,
  useJobsitesYearNonCostedMaterialsLazyQuery,
} from "../../../../../generated/graphql";
import Card from "../../../../Common/Card";
import ShowMore from "../../../../Common/ShowMore";
import Warning from "../../../../Common/Warning";
import JobsiteMaterialCreate from "../../../../Forms/JobsiteMaterial/JobsiteMaterialCreate";
import MaterialShipmentCard from "../../../../Common/MaterialShipment/MaterialShipmentCard";
import JobsiteMaterialCard from "../../../../Common/JobsiteMaterial/JobsiteMaterialCard";
import Permission from "../../../../Common/Permission";
import FormContainer from "../../../../Common/FormContainer";
import Loading from "../../../../Common/Loading";
import { usePanel } from "../../../../../contexts/Panel";

interface IJobsiteMaterialsCosting {
  jobsite: JobsiteFullSnippetFragment;
  selectedJobsiteMaterial?: string;
  displayFullList?: boolean;
  hideExpand?: boolean;
  showPreviousYears?: boolean;
}

const JobsiteMaterialsCosting = ({
  jobsite: propJobsite,
  selectedJobsiteMaterial,
  displayFullList = false,
  hideExpand = false,
  showPreviousYears = true,
}: IJobsiteMaterialsCosting) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading } = useJobsitesMaterialsQuery({
    variables: {
      id: propJobsite._id,
    },
  });

  const [
    allNonCostedQuery,
    { data: allNonCostedData, loading: allNonCostedLoading },
  ] = useJobsitesNonCostedMaterialsLazyQuery({
    variables: { id: propJobsite._id },
  });

  const [
    yearNonCostedQuery,
    { data: yearNonCostedData, loading: yearNonCostedLoading },
  ] = useJobsitesYearNonCostedMaterialsLazyQuery({
    variables: { id: propJobsite._id },
  });

  const [addForm, setAddForm] = React.useState(false);

  const [nonCostedList, setNonCostedList] = React.useState(false);

  const { addPanel } = usePanel();

  /**
   * ----- Variables -----
   */

  const jobsite = React.useMemo(() => {
    if (data?.jobsite && !loading) {
      return data.jobsite;
    } else return null;
  }, [data, loading]);

  const materialsList = React.useMemo(() => {
    if (jobsite) {
      return [
        ...jobsite.materials.filter(
          (material) => material._id === selectedJobsiteMaterial
        ),
        ...jobsite.materials.filter(
          (material) => material._id !== selectedJobsiteMaterial
        ),
      ];
    } else return [];
  }, [jobsite, selectedJobsiteMaterial]);

  const nonCostedMaterials = React.useMemo(() => {
    if (showPreviousYears) {
      return allNonCostedData?.jobsite.nonCostedMaterialShipments;
    } else {
      return yearNonCostedData?.jobsite.yearsNonCostedMaterialShipments;
    }
  }, [
    allNonCostedData?.jobsite.nonCostedMaterialShipments,
    showPreviousYears,
    yearNonCostedData?.jobsite.yearsNonCostedMaterialShipments,
  ]);

  const nonCostedLoading = React.useMemo(() => {
    return allNonCostedLoading || yearNonCostedLoading;
  }, [allNonCostedLoading, yearNonCostedLoading]);

  /**
   * ----- Lifecycle -----
   */

  React.useEffect(() => {
    if (showPreviousYears && !allNonCostedData?.jobsite) {
      allNonCostedQuery();
    } else if (!showPreviousYears && !yearNonCostedData?.jobsite) {
      yearNonCostedQuery();
    }
  }, [
    allNonCostedData?.jobsite,
    allNonCostedQuery,
    showPreviousYears,
    yearNonCostedData?.jobsite,
    yearNonCostedQuery,
  ]);

  /**
   * ----- Rendering -----
   */

  const jobsiteNonCostedMaterialContent = React.useMemo(() => {
    if (nonCostedMaterials) {
      if (nonCostedMaterials.length > 0) {
        return (
          <Warning
            description={`${nonCostedMaterials.length} non-costed`}
            onClick={() => setNonCostedList(!nonCostedList)}
          />
        );
      } else return null;
    } else if (nonCostedLoading) return <Loading />;
    else return null;
  }, [nonCostedList, nonCostedLoading, nonCostedMaterials]);

  const nonCostedMaterialList = React.useMemo(() => {
    if (nonCostedMaterials) {
      return nonCostedMaterials.map((materialShipment) => (
        <MaterialShipmentCard
          backgroundColor="white"
          key={materialShipment._id}
          materialShipment={materialShipment}
          dailyReport={materialShipment.dailyReport}
        />
      ));
    } else return null;
  }, [nonCostedMaterials]);

  const jobsiteMaterialContent = React.useMemo(() => {
    if (jobsite) {
      return (
        <HStack spacing={2}>
          {jobsiteNonCostedMaterialContent}
          <Permission>
            <IconButton
              icon={addForm ? <FiX /> : <FiPlus />}
              aria-label="add"
              backgroundColor="transparent"
              onClick={() => setAddForm(!addForm)}
            />
          </Permission>
        </HStack>
      );
    } else return null;
  }, [addForm, jobsite, jobsiteNonCostedMaterialContent]);

  const otherContent = React.useMemo(() => {
    if (jobsite) {
      let materialsContent: React.ReactNode = <Center>No Materials</Center>;
      if (materialsList.length > 0) {
        if (displayFullList) {
          materialsContent = materialsList.map((jobsiteMaterial) => (
            <JobsiteMaterialCard
              jobsiteMaterial={jobsiteMaterial}
              key={jobsiteMaterial._id}
              selected={jobsiteMaterial._id === selectedJobsiteMaterial}
              showPreviousYears={showPreviousYears}
            />
          ));
        } else {
          materialsContent = (
            <ShowMore
              list={materialsList.map((jobsiteMaterial) => (
                <JobsiteMaterialCard
                  jobsiteMaterial={jobsiteMaterial}
                  key={jobsiteMaterial._id}
                  selected={jobsiteMaterial._id === selectedJobsiteMaterial}
                  showPreviousYears={showPreviousYears}
                />
              ))}
            />
          );
        }
      }

      return (
        <>
          {addForm && (
            <FormContainer>
              <JobsiteMaterialCreate
                onSuccess={() => setAddForm(false)}
                jobsiteId={jobsite._id}
              />
            </FormContainer>
          )}
          {nonCostedList && (
            <Box p={4} borderRadius={6} backgroundColor="red.100">
              {nonCostedMaterialList}
            </Box>
          )}
          <Flex w="100%" flexDir="column" px={4} py={2}>
            {materialsContent}
          </Flex>
        </>
      );
    } else return <Loading />;
  }, [jobsite, materialsList, addForm, nonCostedList, nonCostedMaterialList, displayFullList, selectedJobsiteMaterial, showPreviousYears]);

  return (
    <Card h="fit-content">
      <Flex flexDir="row" justifyContent="space-between">
        <Heading my="auto" ml={2} size="md" w="100%">
          Materials ({jobsite ? jobsite.materials.length : "?"})
        </Heading>
        {jobsiteMaterialContent}
        {!hideExpand && (
          <IconButton
            icon={<FiMaximize />}
            aria-label="maximize"
            onClick={() => addPanel.jobsiteMaterial(propJobsite)}
            background="transparent"
          />
        )}
      </Flex>
      {otherContent}
    </Card>
  );
};

export default JobsiteMaterialsCosting;
