import React from "react";
import {
  useVehicleSearchLazyQuery,
  VehicleSearchSnippetFragment,
  useVehicleFetchSearchLazyQuery,
} from "../../generated/graphql";
import isObjectId from "../../utils/isObjectId";
import TextDropdown from "../Common/forms/TextDropdown";

import { ITextField } from "../Common/forms/TextField";

interface IVehicleSearch extends ITextField {
  vehicleSelected: (vehicle: { _id: string }) => void;
  handleSubmit?: (name: string) => void;
  blacklistedIds?: string[];
}

const VehicleSearch = ({
  vehicleSelected,
  handleSubmit,
  blacklistedIds,
  ...props
}: IVehicleSearch) => {
  /**
   * ----- Hook Initialization -----
   */

  const [foundVehicles, setFoundVehicles] = React.useState<
    VehicleSearchSnippetFragment[]
  >([]);

  const [searchString, setSearchString] = React.useState(
    props.defaultValue?.toString() || ""
  );

  const [searchTimeout, setSearchTimeout] = React.useState<NodeJS.Timeout>();

  const [search, { loading, data }] = useVehicleSearchLazyQuery();

  const [fetch, { loading: fetchLoading, data: fetchData }] =
    useVehicleFetchSearchLazyQuery();

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
    } else setFoundVehicles([]);
  };

  /**
   * ----- Variables -----
   */

  const options = React.useMemo(() => {
    return foundVehicles.map((vehicle) => {
      return {
        label: `${vehicle.name} (${vehicle.vehicleCode}) - ${vehicle.vehicleType}`,
        value: vehicle._id,
      };
    });
  }, [foundVehicles]);

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (!loading && data) {
      setFoundVehicles(data.vehicleSearch);
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
    if (fetchData?.vehicle && !fetchLoading) {
      setSearchString(fetchData.vehicle.name);
      vehicleSelected({ _id: fetchData.vehicle._id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, fetchLoading]);

  /**
   * ----- Rendering -----
   */

  return (
    <TextDropdown
      options={options}
      placeholder="Search vehicles"
      onOptionSelection={(value) => {
        setSearchString(value.label);
        vehicleSelected({
          _id: value.value,
        });
        setFoundVehicles([]);
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

export default VehicleSearch;
