import { Center, Stack, Text } from "@chakra-ui/react";
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
        <i>Keep in mind that this may take up to a few minutes to load</i>
        <Stack spacing={2}>
          {data.company.materialReportYears.map((year) => {
            return (
              <TextLink link={createLink.server_companyMaterialReportDownload(data.company._id, year)} newTab key={year}>
                Material Report {year}
              </TextLink>
            );
          })}
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
