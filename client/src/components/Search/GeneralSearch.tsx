import dayjs from "dayjs";
import React from "react";
import {
  SearchSnippetFragment,
  useSearchLazyQuery,
} from "../../generated/graphql";
import TextDropdown, { IOptions } from "../Common/forms/TextDropdown";
import { ITextField } from "../Common/forms/TextField";

interface IExtraData {
  type: "employee" | "vehicle" | "jobsite" | "dailyReport" | "crew" | "company";
}

interface IGeneralSearch extends Omit<ITextField, "onChange"> {
  itemSelected: (
    value: { value: string; label: string },
    extraData: IExtraData
  ) => void;
  onChange?: (value: string) => void;
  handleSubmit?: (string: string) => void;
}

const GeneralSearch = ({
  itemSelected,
  onChange,
  handleSubmit,
  ...props
}: IGeneralSearch) => {
  /**
   * ----- Hook Initialization -----
   */

  const [foundItems, setFoundItems] = React.useState<SearchSnippetFragment[]>(
    []
  );

  const [searchString, setSearchString] = React.useState(
    props.defaultValue?.toString() || props.value?.toString() || ""
  );

  const [searchTimeout, setSearchTimeout] = React.useState<NodeJS.Timeout>();

  const [search, { loading, data }] = useSearchLazyQuery();

  /**
   * ----- Functions -----
   */

  const handleChange = React.useCallback(
    (value: string) => {
      setSearchString(value);
      if (searchTimeout) clearTimeout(searchTimeout);
      if (value !== "") {
        setSearchTimeout(
          setTimeout(() => {
            search({
              variables: {
                searchString: value,
              },
            });
          }, 500)
        );
      } else setFoundItems([]);
    },
    [search, searchTimeout]
  );

  /**
   * ----- Variables -----
   */

  const options: IOptions<IExtraData>[] = React.useMemo(() => {
    return foundItems.map((item) => {
      if (!!item.employee) {
        return {
          value: item.employee._id,
          label: `${item.employee.name} ${
            !!item.employee.jobTitle ? ` - ${item.employee.jobTitle}` : ""
          }`,
          extraData: {
            type: "employee",
          },
        };
      } else if (!!item.vehicle) {
        return {
          value: item.vehicle._id,
          label: `${item.vehicle.name} (${item.vehicle.vehicleCode}) - ${item.vehicle.vehicleType}`,
          extraData: {
            type: "vehicle",
          },
        };
      } else if (!!item.jobsite) {
        return {
          value: item.jobsite._id,
          label: `${item.jobsite.jobcode && `${item.jobsite.jobcode}: `}${
            item.jobsite.name
          }`,
          extraData: {
            type: "jobsite",
          },
        };
      } else if (!!item.dailyReport) {
        return {
          value: item.dailyReport._id,
          label: `${item.dailyReport.crew.name} at ${
            item.dailyReport.jobsite.name
          } - ${dayjs(item.dailyReport.date).format("MMMM DD, YYYY")}`,
          extraData: {
            type: "dailyReport",
          },
        };
      } else if (!!item.crew) {
        return {
          value: item.crew._id,
          label: item.crew.name,
          extraData: {
            type: "crew",
          },
        };
      } else if (!!item.company) {
        return {
          value: item.company._id,
          label: item.company.name,
          extraData: {
            type: "company",
          },
        };
      } else {
        return {
          value: "error",
          label: "Something went wrong",
          extraData: {
            type: "vehicle",
          },
        };
      }
    });
  }, [foundItems]);

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (!loading && data) {
      setFoundItems(data.search);
    }
  }, [data, loading]);

  return (
    <TextDropdown
      options={options}
      onOptionSelection={(value, extraData) => itemSelected(value, extraData!)}
      handleSubmit={() => handleSubmit && handleSubmit(searchString)}
      selectOptionsWithEnter
      isLoading={loading}
      {...props}
      onChange={(e) => handleChange(e.target.value)}
      value={searchString}
    />
  );
};

export default GeneralSearch;
