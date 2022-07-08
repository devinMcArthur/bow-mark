import { HStack, SimpleGrid } from "@chakra-ui/react";
import { SubmitHandler, UseFormProps } from "react-hook-form";
import { useInvoiceForm } from "../../../forms/invoice";
import { InvoiceData } from "../../../generated/graphql";
import SubmitButton from "../../Common/forms/SubmitButton";

interface IInvoiceForm {
  submitHandler: SubmitHandler<InvoiceData>;

  formOptions?: UseFormProps;
  isLoading?: boolean;
}

const InvoiceForm = ({
  formOptions,
  submitHandler,
  isLoading,
}: IInvoiceForm) => {
  /**
   * ----- Hook Initialization -----
   */

  const { FormComponents } = useInvoiceForm(formOptions);

  /**
   * ----- Rendering -----
   */

  return (
    <FormComponents.Form submitHandler={submitHandler}>
      <FormComponents.Company isLoading={isLoading} />

      <SimpleGrid spacing={2} columns={[1, 1, 3]}>
        <FormComponents.Cost isLoading={isLoading} />
        <FormComponents.InvoiceNumber isLoading={isLoading} />
        <FormComponents.Date isLoading={isLoading} />
      </SimpleGrid>

      <FormComponents.Description isLoading={isLoading} />

      <HStack spacing={4}>
        <FormComponents.Internal isLoading={isLoading} />
        <FormComponents.Accrual isLoading={isLoading} />
      </HStack>

      <SubmitButton isLoading={isLoading} />
    </FormComponents.Form>
  );
};

export default InvoiceForm;
