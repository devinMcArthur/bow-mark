import React from "react";
import { TruckingRateTypes } from "../../../constants/select";
import Select, { ISelect } from "../../Common/forms/Select";

export interface ITruckingRateType extends Omit<ISelect, "options"> {}

const TruckingRateType = ({ ...props }: ITruckingRateType) => {
  /**
   * ----- Variables -----
   */

  const options: ISelect["options"] = React.useMemo(() => {
    return TruckingRateTypes.map((type) => {
      return {
        title: type,
        value: type,
      };
    });
  }, []);

  /**
   * ----- Rendering -----
   */

  return <Select options={options} {...props} />;
};

export default TruckingRateType;
