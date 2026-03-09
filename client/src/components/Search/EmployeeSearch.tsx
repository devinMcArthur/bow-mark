import React from "react";
import {
  EmployeeCardSnippetFragment,
  useEmployeeFetchSearchLazyQuery,
  useEmployeeSearchLazyQuery,
} from "../../generated/graphql";
import isObjectId from "../../utils/isObjectId";
import TextDropdown from "../Common/forms/TextDropdown";

import { ITextField } from "../Common/forms/TextField";

interface IEmployeeSearch extends ITextField {
  employeeSelected: (crew: { _id: string }) => void;
  handleSubmit?: (name: string) => void;
  blacklistedIds?: string[];
}

const EmployeeSearch = ({
  employeeSelected,
  handleSubmit,
  blacklistedIds,
  ...props
}: IEmployeeSearch) => {
  /**
   * ----- Hook Initialization -----
   */

  const [foundEmployees, setFoundEmployees] = React.useState<
    EmployeeCardSnippetFragment[]
  >([]);

  const [searchString, setSearchString] = React.useState(
    props.defaultValue?.toString() || ""
  );

  const [searchTimeout, setSearchTimeout] = React.useState<NodeJS.Timeout>();

  const [search, { loading, data }] = useEmployeeSearchLazyQuery();

  const [fetch, { loading: fetchLoading, data: fetchData }] =
    useEmployeeFetchSearchLazyQuery();

  /**
   * ----- Functions -----
   */

  const handleChange = (value: string) => {
    setSearchString(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (value !== "") {
      setSearchTimeout(
        setTimeout(() => {
          search({
            variables: {
              searchString: value,
              options: {
                blacklistedIds,
              },
            },
          });
        }, 500)
      );
    } else setFoundEmployees([]);
  };

  /**
   * ----- Variables -----
   */

  const options = React.useMemo(() => {
    return foundEmployees.map((employee) => {
      return {
        label: employee.name,
        value: employee._id,
      };
    });
  }, [foundEmployees]);

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (!loading && data) {
      setFoundEmployees(data.employeeSearch);
    }
  }, [loading, data]);

  React.useEffect(() => {
    if (props.value && isObjectId(props.value.toString())) {
      fetch({
        variables: {
          id: props.value.toString(),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (fetchData?.employee && !fetchLoading) {
      setSearchString(fetchData.employee.name);
      employeeSelected({ _id: fetchData.employee._id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, fetchLoading]);

  /**
   * ----- Rendering -----
   */

  return (
    <TextDropdown
      options={options}
      placeholder="Search Employees"
      onOptionSelection={(value) => {
        setSearchString(value.label);
        employeeSelected({
          _id: value.value,
        });
        setFoundEmployees([]);
      }}
      handleSubmit={() => {
        if (handleSubmit) handleSubmit(searchString);
      }}
      autoComplete="off"
      selectOptionsWithEnter
      {...props}
      onChange={(e) => handleChange(e.target.value)}
      value={searchString}
    />
  );
};

export default EmployeeSearch;
