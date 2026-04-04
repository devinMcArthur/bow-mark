import React from "react";
import { useSystem } from "../../../contexts/System";
import Select, { ISelect } from "./Select";
import { CANONICAL_UNITS } from "../../../constants/units";

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
    const canonical = CANONICAL_UNITS.map((u) => ({ title: u.label, value: u.code }));
    const extras = (system.unitExtras ?? []).map((u) => ({ title: u, value: u }));
    return [...canonical, ...extras];
  }, [system]);

  /**
   * ----- Rendering -----
   */

  return <Select options={options} placeholder="Select unit" {...props} />;
};

export default Unit;
