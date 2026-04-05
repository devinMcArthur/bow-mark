import { FormControl, FormLabel, VStack } from "@chakra-ui/react";
import React from "react";
import Checkbox from "./Checkbox";

interface IOption {
  value: string;
  label: string;
}

interface ISelectMultiple {
  value: string[];
  label?: string;
  options: IOption[];
  onSelectionChange: (selection: string[]) => void;
}

const SelectMultiple = ({
  value,
  label,
  options,
  onSelectionChange,
}: ISelectMultiple) => {
  /**
   * ----- Functions -----
   */

  const handleSelect = (option: string) => {
    const index = value.indexOf(option);
    if (index !== -1) {
      onSelectionChange(value.filter((_, i) => i !== index));
    } else {
      onSelectionChange([...value, option]);
    }
  };

  /**
   * ----- Rendering -----
   */

  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <VStack spacing={2}>
        {options.map((option) => (
          <Checkbox
            w="100%"
            key={option.value}
            value={option.value}
            isChecked={value.includes(option.value)}
            onChange={() => handleSelect(option.value)}
          >
            {option.label}
          </Checkbox>
        ))}
      </VStack>
    </FormControl>
  );
};

export default SelectMultiple;
