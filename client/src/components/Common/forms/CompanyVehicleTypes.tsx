import React from "react";
import { useSystem } from "../../../contexts/System";
import ContactOffice from "../ContactOffice";
import Select, { ISelect } from "./Select";

export interface ICompanyVehicleTypes extends Omit<ISelect, "options"> {}

const CompanyVehicleTypes = ({
  helperText = (
    <>
      contact <ContactOffice /> to add types
    </>
  ),
  ...props
}: ICompanyVehicleTypes) => {
  /**
   * ------ Hook Initialization -----
   */

  const {
    state: { system },
  } = useSystem();

  /**
   * ----- Variables -----
   */

  const options: ISelect["options"] = React.useMemo(() => {
    if (!system) return [];
    const options: ISelect["options"] = [];

    for (let i = 0; i < system.companyVehicleTypeDefaults.length; i++) {
      options.push({
        title: system.companyVehicleTypeDefaults[i].title,
        value: system.companyVehicleTypeDefaults[i].title,
      });
    }
    return options;
  }, [system]);

  /**
   * ----- Rendering -----
   */

  return <Select options={options} helperText={helperText} {...props} />;
};

export default CompanyVehicleTypes;
