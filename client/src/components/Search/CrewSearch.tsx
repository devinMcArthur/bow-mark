import React from "react";
import {
  CrewCardSnippetFragment,
  useCrewCardLazyQuery,
  useCrewSearchLazyQuery,
} from "../../generated/graphql";
import isObjectId from "../../utils/isObjectId";
import TextDropdown from "../Common/forms/TextDropdown";

import { ITextField } from "../Common/forms/TextField";

interface ICrewSearch extends ITextField {
  crewSelected: (crew: { _id: string }) => void;
  handleSubmit?: (name: string) => void;
  blacklistedIds?: string[];
}

const CrewSearch = ({
  crewSelected,
  handleSubmit,
  blacklistedIds,
  ...props
}: ICrewSearch) => {
  /**
   * ----- Hook Initialization -----
   */

  const [foundCrews, setFoundCrews] = React.useState<CrewCardSnippetFragment[]>(
    []
  );

  const [searchString, setSearchString] = React.useState(
    props.defaultValue?.toString() || ""
  );

  const [searchTimeout, setSearchTimeout] = React.useState<NodeJS.Timeout>();

  const [search, { loading, data }] = useCrewSearchLazyQuery();

  const [fetch, { loading: fetchLoading, data: fetchData }] =
    useCrewCardLazyQuery();

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
    } else setFoundCrews([]);
  };

  /**
   * ----- Variables -----
   */

  const options = React.useMemo(() => {
    return foundCrews.map((crew) => {
      return {
        label: crew.name,
        value: crew._id,
      };
    });
  }, [foundCrews]);

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (!loading && data) {
      setFoundCrews(data.crewSearch);
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
    if (fetchData?.crew && !fetchLoading) {
      setSearchString(fetchData.crew.name);
      crewSelected({ _id: fetchData.crew._id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, fetchLoading]);

  /**
   * ----- Rendering -----
   */

  return (
    <TextDropdown
      options={options}
      placeholder="Search Crews"
      onOptionSelection={(value) => {
        setSearchString(value.label);
        crewSelected({
          _id: value.value,
        });
        setFoundCrews([]);
      }}
      handleSubmit={() => {
        if (handleSubmit) handleSubmit(searchString);
      }}
      autoComplete="off"
      selectOptionsWithEnter
      isLoading={loading}
      {...props}
      value={searchString}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
};

export default CrewSearch;
