import { Flex } from "@chakra-ui/react";
import { JobsiteMaterialCostType } from "../../../generated/graphql";
import Select, { ISelect } from "../../Common/forms/Select";

export interface IJobsiteMaterialCostTypeForm
  extends Omit<ISelect, "options" | "value" | "onChange"> {
  value?: JobsiteMaterialCostType;
  onChange?: (type: JobsiteMaterialCostType) => void;
}

const JobsiteMaterialCostTypeForm = ({
  value,
  onChange,
  ...props
}: IJobsiteMaterialCostTypeForm) => {
  /**
   * ----- Rendering -----
   */

  return (
    <Flex flexDir="row">
      <Select
        {...props}
        onChange={(e) =>
          onChange && onChange(e.target.value as JobsiteMaterialCostType)
        }
        value={value}
        options={[
          {
            value: JobsiteMaterialCostType.Rate,
            title: "Normal Rate",
          },
          {
            value: JobsiteMaterialCostType.DeliveredRate,
            title: "Delivered",
          },
          {
            value: JobsiteMaterialCostType.Invoice,
            title: "Invoices",
          },
        ]}
      />
    </Flex>
  );
};

export default JobsiteMaterialCostTypeForm;
