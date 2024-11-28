import { Center, Heading, Stack, Text } from "@chakra-ui/react";
import {
  CompanyCardSnippetFragment,
  useCompanyFullQuery,
} from "../../../generated/graphql";
import Loading from "../../Common/Loading";
import createLink from "../../../utils/createLink";
import TextLink from "../../Common/TextLink";

interface ICompanyClientContent {
  company: CompanyCardSnippetFragment;
}

const CompanyClientContent = ({ company }: ICompanyClientContent) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data, loading } = useCompanyFullQuery({
    variables: {
      id: company._id,
    },
  });

  /**
   * ----- Render -----
   */

  if (data?.company && !loading) {
    return (
      <div>
        <Stack spacing={4}>
          <div>
            <Heading size="md">Material Reports</Heading>
            <Stack>
              {data.company.materialReportYears.length === 0 ? (
                <Text>No material reports available</Text>
              ) : data.company.materialReportYears.map((year) => {
                return (
                  <TextLink link={createLink.server_companyMaterialReportDownload(data.company._id, year)} newTab key={year}>
                    Material Report {year}
                  </TextLink>
                );
              })}
            </Stack>
          </div>
          <div>
            <Heading size="md">Invoice Reports</Heading>
            <Stack>
              {data.company.invoiceReportYears.length === 0 ? (
                <Text>No invoice reports available</Text>
              ) : data.company.invoiceReportYears.map((year) => {
                return (
                  <TextLink link={createLink.server_companyInvoiceReportDownload(data.company._id, year)} newTab key={year}>
                    Invoice Report {year}
                  </TextLink>
                );
              })}
            </Stack>
          </div>
        </Stack>
      </div>
    );
  } else {
    return (
      <Center flexDir="column" m="auto">
        <Text>Generating reports, this may take a few minutes</Text>
        <Loading />
      </Center>
    );
  }
};

export default CompanyClientContent;
