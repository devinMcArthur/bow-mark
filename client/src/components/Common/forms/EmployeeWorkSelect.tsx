import React from "react";
import { useSystem } from "../../../contexts/System";
import Select, { ISelect } from "./Select";

export interface IEmployeeWorkSelect extends Omit<ISelect, "options"> {}

const EmployeeWorkSelect = ({
  placeholder = "Select work",
  ...props
}: IEmployeeWorkSelect) => {
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

    for (let i = 0; i < system.laborTypes.length; i++) {
      options.push({
        title: system.laborTypes[i],
        value: system.laborTypes[i],
      });
    }
    return options;
  }, [system]);

  /**
   * ----- Rendering -----
   */

  return <Select placeholder={placeholder} options={options} {...props} />;
};

export default EmployeeWorkSelect;
