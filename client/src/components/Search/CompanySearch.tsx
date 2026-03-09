import React from "react";
import { useCompaniesQuery } from "../../generated/graphql";
import isObjectId from "../../utils/isObjectId";
import TextDropdown, { IOptions } from "../Common/forms/TextDropdown";

import { ITextField } from "../Common/forms/TextField";

interface ICompanySearch extends ITextField {
  companySelected: (crew: { _id: string; name: string }) => void;
  handleSubmit?: (name: string) => void;
  blacklistedIds?: string[];
}

const CompanySearch = ({
  companySelected,
  handleSubmit,
  blacklistedIds,
  onChange,
  ...props
}: ICompanySearch) => {
  /**
   * ----- Hook Initialization -----
   */

  const { data } = useCompaniesQuery();

  const [options, setOptions] = React.useState<IOptions<{}>[]>([]);

  const [searchString, setSearchString] = React.useState("");

  const [searchTimeout, setSearchTimeout] = React.useState<NodeJS.Timeout>();

  /**
   * ----- Variables -----
   */

  const fullOptions: IOptions<{}>[] = React.useMemo(() => {
    if (data?.companies) {
      return data.companies.map((company) => {
        return {
          label: company.name,
          value: company._id,
        };
      });
    } else return [];
  }, [data]);

  /**
   * ----- Functions -----
   */

  const setDefaultOptions = React.useCallback(() => {
    if (data?.companies) {
      setOptions(
        data.companies.map((company) => {
          return {
            label: company.name,
            value: company._id,
          };
        })
      );
    }
  }, [data?.companies]);

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
    if (data?.companies) {
      setDefaultOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  React.useEffect(() => {
    if (props.value && isObjectId(props.value.toString())) {
      const option = fullOptions.find((option) => option.value === props.value);

      if (option) {
        setSearchString(option.label);
        companySelected({
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
      placeholder="Search Companies"
      onOptionSelection={(value) => {
        setSearchString(value.label);
        companySelected({
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

export default CompanySearch;
