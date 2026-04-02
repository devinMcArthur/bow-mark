import React, { useState } from "react";
import { Box, Heading, Spinner, Text } from "@chakra-ui/react";
import { gql, useQuery, useMutation } from "@apollo/client";
import { useRouter } from "next/router";
import Container from "../../../components/Common/Container";
import Permission from "../../../components/Common/Permission";
import Breadcrumbs from "../../../components/Common/Breadcrumbs";
import PricingSheet from "../../../components/TenderPricing/PricingSheet";
import { TenderPricingSheet } from "../../../components/TenderPricing/types";
import { UserRoles } from "../../../generated/graphql";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const SHEET_QUERY = gql`
  query TenderPricingSheetQuery($tenderId: ID!) {
    tenderPricingSheet(tenderId: $tenderId) {
      _id
      defaultMarkupPct
      rows {
        _id
        type
        sortOrder
        itemNumber
        description
        indentLevel
        quantity
        unit
        unitPrice
        notes
        calculatorType
        calculatorInputsJson
        markupOverride
        rateBuildupSnapshot
      }
    }
  }
`;

const TENDER_NAME_QUERY = gql`
  query TenderNameForPricing($id: ID!) {
    tender(id: $id) {
      _id
      name
      jobcode
    }
  }
`;

const CREATE_SHEET = gql`
  mutation TenderPricingSheetCreate($tenderId: ID!) {
    tenderPricingSheetCreate(tenderId: $tenderId) {
      _id
      defaultMarkupPct
      rows {
        _id
        type
        sortOrder
        itemNumber
        description
        indentLevel
        quantity
        unit
        unitPrice
        notes
        calculatorType
        calculatorInputsJson
        markupOverride
        rateBuildupSnapshot
      }
    }
  }
`;

// ─── Page ─────────────────────────────────────────────────────────────────────

const TenderPricingPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const tenderId = typeof id === "string" ? id : "";

  const [sheet, setSheet] = useState<TenderPricingSheet | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { data: tenderData } = useQuery(TENDER_NAME_QUERY, {
    variables: { id: tenderId },
    skip: !tenderId,
  });

  const [createSheet] = useMutation(CREATE_SHEET);

  useQuery(SHEET_QUERY, {
    variables: { tenderId },
    skip: !tenderId || initialized,
    onCompleted: async (data) => {
      if (data.tenderPricingSheet) {
        setSheet(data.tenderPricingSheet);
        setInitialized(true);
      } else {
        // Auto-create on first visit
        const res = await createSheet({ variables: { tenderId } });
        setSheet(res.data.tenderPricingSheetCreate);
        setInitialized(true);
      }
    },
  });

  const tender = tenderData?.tender;
  const tenderLabel = tender ? `${tender.jobcode} — ${tender.name}` : "...";

  return (
    <Permission minRole={UserRoles.ProjectManager} type={null} showError>
      <Container>
        <Breadcrumbs
          crumbs={[
            { title: "Tenders", link: "/tenders" },
            { title: tenderLabel, link: `/tender/${tenderId}` },
            { title: "Pricing", isCurrentPage: true },
          ]}
        />

        <Heading size="md" mb={6} mt={2}>
          Pricing Sheet
        </Heading>

        {!initialized ? (
          <Spinner />
        ) : sheet ? (
          <PricingSheet sheet={sheet} tenderId={tenderId} onUpdate={setSheet} />
        ) : (
          <Text color="gray.500">Unable to load pricing sheet.</Text>
        )}
      </Container>
    </Permission>
  );
};

export default TenderPricingPage;
