import React from "react";
import { useSystem } from "../../../contexts/System";
import Select, { ISelect } from "./Select";

export interface IUnit extends Omit<ISelect, "options"> {}

const Unit = ({ ...props }: IUnit) => {
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

    for (let i = 0; i < system.unitDefaults.length; i++) {
      options.push({
        title: system.unitDefaults[i],
        value: system.unitDefaults[i],
      });
    }
    return options;
  }, [system]);

  /**
   * ----- Rendering -----
   */

  return <Select options={options} placeholder="Select unit" {...props} />;
};

export default Unit;
