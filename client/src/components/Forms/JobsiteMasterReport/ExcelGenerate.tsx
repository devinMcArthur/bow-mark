import { Center, Icon, Link, Text } from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { AiOutlineFileExcel } from "react-icons/ai";
import { useJobsiteMasterReportExcelGenerateForm } from "../../../forms/jobsiteMasterReport";
import {
  Scalars,
  useJobsiteMasterExcelReportByDateLazyQuery,
} from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

const JobsiteMasterReportExcelGenerate = () => {
  /**
   * ----- Hook Initialization -----
   */

  const [getExcel, { loading, data }] =
    useJobsiteMasterExcelReportByDateLazyQuery();

  const { FormComponents } = useJobsiteMasterReportExcelGenerateForm();

  const [startEnd, setStartEnd] = React.useState<{
    startTime: Scalars["DateTime"];
    endTime: Scalars["DateTime"];
  }>();

  /**
   * ----- Functions -----
   */

  const handleSubmit = (data: {
    startTime: Scalars["DateTime"];
    endTime: Scalars["DateTime"];
  }) => {
    getExcel({
      variables: {
        startTime: data.startTime,
        endTime: data.endTime,
      },
    }).then((res) => {
      if (res.data?.jobsiteMasterExcelReportByDate) {
        setStartEnd({
          startTime: data.startTime,
          endTime: data.endTime,
        });
      }
    });
  };

  /**
   * ----- Rendering -----
   */

  const excelDownload = React.useMemo(() => {
    if (data?.jobsiteMasterExcelReportByDate) {
      return (
        <Link
          passHref
          href={data.jobsiteMasterExcelReportByDate}
          download={`Master-Costing-${dayjs(startEnd?.startTime).format(
            "MMM-D-YY"
          )}-${dayjs(startEnd?.endTime).format("MMM-D-YY")}`}
        >
          <Center
            cursor="pointer"
            backgroundColor="gray.200"
            borderRadius={4}
            m={2}
            p={2}
          >
            <Icon boxSize={12} as={AiOutlineFileExcel} />
            <Text fontSize="bold">Download</Text>
          </Center>
        </Link>
      );
    } else {
      return null;
    }
  }, [
    data?.jobsiteMasterExcelReportByDate,
    startEnd?.endTime,
    startEnd?.startTime,
  ]);

  return (
    <FormComponents.Form submitHandler={handleSubmit}>
      <FormComponents.StartTime isLoading={loading} />
      <FormComponents.EndTime isLoading={loading} />
      <SubmitButton isLoading={loading} />
      {excelDownload}
    </FormComponents.Form>
  );
};

export default JobsiteMasterReportExcelGenerate;
