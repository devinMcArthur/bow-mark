import { Flex } from "@chakra-ui/react";
import { CrewTypes } from "../../../generated/graphql";
import Select, { ISelect } from "../../Common/forms/Select";

export interface ICrewType
  extends Omit<ISelect, "options" | "value" | "onChange"> {
  value?: CrewTypes;
  onChange?: (type: CrewTypes) => void;
}

const CrewType = ({ value, onChange, ...props }: ICrewType) => {
  /**
   * ----- Rendering -----
   */

  return (
    <Flex flexDir="row">
      <Select
        {...props}
        onChange={(e) => onChange && onChange(e.target.value as CrewTypes)}
        value={value}
        options={[
          {
            value: CrewTypes.Base,
            title: CrewTypes.Base,
          },
          {
            value: CrewTypes.BasePrep,
            title: CrewTypes.BasePrep,
          },
          {
            value: CrewTypes.BreakoutCb,
            title: CrewTypes.BreakoutCb,
          },
          {
            value: CrewTypes.Breakout,
            title: CrewTypes.Breakout,
          },
          {
            value: CrewTypes.CatchBasins,
            title: CrewTypes.CatchBasins,
          },
          {
            value: CrewTypes.FormLineSetting,
            title: CrewTypes.FormLineSetting,
          },
          {
            value: CrewTypes.FormTruck,
            title: CrewTypes.FormTruck,
          },
          {
            value: CrewTypes.Patch,
            title: CrewTypes.Patch,
          },
          {
            value: CrewTypes.Paving,
            title: CrewTypes.Paving,
          },
          {
            value: CrewTypes.Pour,
            title: CrewTypes.Pour,
          },
          {
            value: CrewTypes.Shop,
            title: CrewTypes.Shop,
          },
        ]}
      />
    </Flex>
  );
};

export default CrewType;
