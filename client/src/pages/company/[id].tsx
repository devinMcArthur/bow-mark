import { GetServerSideProps } from "next";
import { PageCompanyCardComp, ssrCompanyCard } from "../../generated/page";
import Container from "../../components/Common/Container";
import { Heading, Box } from "@chakra-ui/react";
import ClientOnly from "../../components/Common/ClientOnly";
import CompanyClientContent from "../../components/pages/company/ClientContent";

const Company: PageCompanyCardComp = ({ data }) => {
  const company = data!.company;

  return (
    <Container>
      <Heading>{company.name}</Heading>
      <Box>
        <ClientOnly>
          <CompanyClientContent company={company} />
        </ClientOnly>
      </Box>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  ...ctx
}) => {
  const res = await ssrCompanyCard.getServerPage(
    { variables: { id: params?.id as string } },
    ctx
  );

  let notFound = false;
  if (!res.props.data.company) notFound = true;

  return { ...res, notFound };
};

export default Company;
