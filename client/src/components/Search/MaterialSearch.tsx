import React from "react";
import { useMaterialsCardQuery } from "../../generated/graphql";
import isObjectId from "../../utils/isObjectId";
import TextDropdown, { IOptions } from "../Common/forms/TextDropdown";

import { ITextField } from "../Common/forms/TextField";

interface IMaterialSearch extends ITextField {
  materialSelected: (material: { _id: string; name: string }) => void;
  handleSubmit?: (name: string) => void;
  blacklistedIds?: string[];
}

const MaterialSearch = ({
  materialSelected,
  handleSubmit,
  blacklistedIds,
  onChange,
  ...props
}: IMaterialSearch) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data } = useMaterialsCardQuery();

  const [options, setOptions] = React.useState<IOptions<{}>[]>([]);

  const [searchString, setSearchString] = React.useState("");

  const [searchTimeout, setSearchTimeout] = React.useState<NodeJS.Timeout>();

  /**
   * ----- Variables -----
   */

  const fullOptions: IOptions<{}>[] = React.useMemo(() => {
    if (data?.materials) {
      return data.materials.map((material) => {
        return {
          label: material.name,
          value: material._id,
        };
      });
    } else return [];
  }, [data]);

  /**
   * ----- Functions -----
   */

  const setDefaultOptions = React.useCallback(() => {
    if (data?.materials) {
      setOptions(
        data.materials.map((company) => {
          return {
            label: company.name,
            value: company._id,
          };
        })
      );
    }
  }, [data?.materials]);

  const filterOptions = React.useCallback(
    (searchString: string) => {
      const fullOptionsCopy: IOptions<{}>[] = JSON.parse(
        JSON.stringify(fullOptions)
      );
      setOptions(
        fullOptionsCopy.filter((option) =>
          option.label.toLowerCase().match(searchString.toLowerCase())
        )
      );
    },
    [fullOptions]
  );

  const handleChange = React.useCallback(
    (value: string) => {
      setSearchString(value);
      if (searchTimeout) clearTimeout(searchTimeout);
      if (value !== "") {
        setSearchTimeout(
          setTimeout(() => {
            filterOptions(value);
          }, 500)
        );
      } else setDefaultOptions();
    },
    [filterOptions, searchTimeout, setDefaultOptions]
  );

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (data?.materials) {
      setDefaultOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  React.useEffect(() => {
    if (props.value && isObjectId(props.value.toString())) {
      const option = fullOptions.find((option) => option.value === props.value);

      if (option) {
        setSearchString(option.label);
        materialSelected({
          _id: option.value,
          name: option.label,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullOptions]);

  React.useEffect(() => {
    if (props.value && !isObjectId(props.value.toString())) {
      setSearchString(props.value.toString());
    }
  }, [props.value]);

  /**
   * ----- Rendering -----
   */

  return (
    <TextDropdown
      options={options}
      placeholder="Search Materials"
      onOptionSelection={(value) => {
        setSearchString(value.label);
        materialSelected({
          _id: value.value,
          name: value.label,
        });
        setDefaultOptions();
      }}
      handleSubmit={() => {
        if (handleSubmit) handleSubmit(searchString);
      }}
      autoComplete="off"
      selectOptionsWithEnter
      {...props}
      onChange={(e) => {
        if (onChange) onChange(e);
        handleChange(e.target.value);
      }}
      value={searchString}
    />
  );
};

export default MaterialSearch;
