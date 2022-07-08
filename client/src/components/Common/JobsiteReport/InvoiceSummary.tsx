import {
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatProps,
} from "@chakra-ui/react";
import React from "react";
import { JobsiteDayReportInvoiceSnippetFragment } from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";

interface IJobsiteReportInvoiceSummary {
  invoices: JobsiteDayReportInvoiceSnippetFragment[];
  statSize?: StatProps["size"];
}

const JobsiteReportInvoiceSummary = ({
  invoices,
  statSize = "sm",
}: IJobsiteReportInvoiceSummary) => {
  /**
   * ----- Variables -----
   */

  const values: { internal: number; external: number; accrual: number } =
    React.useMemo(() => {
      const values = {
        internal: 0,
        external: 0,
        accrual: 0,
      };
      for (let i = 0; i < invoices.length; i++) {
        if (invoices[i].accrual) values.accrual += invoices[i].value;
        else if (invoices[i].internal) values.internal += invoices[i].value;
        else values.external += invoices[i].value;
      }

      return values;
    }, [invoices]);

  /**
   * ----- Rendering -----
   */

  return (
    <SimpleGrid columns={3} spacing={2}>
      <Stat size={statSize} display="flex" justifyContent="center">
        <StatLabel>External</StatLabel>
        <StatNumber>${formatNumber(values.external)}</StatNumber>
      </Stat>
      <Stat size={statSize} display="flex" justifyContent="center">
        <StatLabel>Internal</StatLabel>
        <StatNumber>${formatNumber(values.internal)}</StatNumber>
      </Stat>
      <Stat size={statSize} display="flex" justifyContent="center">
        <StatLabel>Accrual</StatLabel>
        <StatNumber>${formatNumber(values.accrual)}</StatNumber>
      </Stat>
    </SimpleGrid>
  );
};

export default JobsiteReportInvoiceSummary;
