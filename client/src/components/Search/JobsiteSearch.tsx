import React from "react";
import {
  JobsiteCardSnippetFragment,
  useJobsiteFetchSearchLazyQuery,
  useJobsiteSearchLazyQuery,
} from "../../generated/graphql";
import isObjectId from "../../utils/isObjectId";
import TextDropdown from "../Common/forms/TextDropdown";

import { ITextField } from "../Common/forms/TextField";

interface IJobsiteSearch extends ITextField {
  jobsiteSelected: (jobsite: { _id: string }) => void;
  handleSubmit?: (name: string) => void;
  blacklistedIds?: string[];
}

const JobsiteSearch = ({
  jobsiteSelected,
  handleSubmit,
  blacklistedIds,
  ...props
}: IJobsiteSearch) => {
  /**
   * ----- Hook Initialization -----
   */

  const [foundJobsites, setFoundJobsites] = React.useState<
    JobsiteCardSnippetFragment[]
  >([]);

  const [searchString, setSearchString] = React.useState(
    props.defaultValue?.toString() || ""
  );

  const [searchTimeout, setSearchTimeout] = React.useState<NodeJS.Timeout>();

  const [search, { loading, data }] = useJobsiteSearchLazyQuery();

  const [fetch, { loading: fetchLoading, data: fetchData }] =
    useJobsiteFetchSearchLazyQuery();

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
    } else setFoundJobsites([]);
  };

  /**
   * ----- Variables -----
   */

  const options = React.useMemo(() => {
    return foundJobsites.map((jobsite) => {
      return {
        label: `${jobsite.jobcode}: ${jobsite.name}`,
        value: jobsite._id,
      };
    });
  }, [foundJobsites]);

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (!loading && data) {
      setFoundJobsites(data.jobsiteSearch);
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
    if (fetchData?.jobsite && !fetchLoading) {
      setSearchString(
        `${fetchData.jobsite.jobcode}: ${fetchData.jobsite.name}`
      );
      jobsiteSelected({ _id: fetchData.jobsite._id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, fetchLoading]);

  /**
   * ----- Rendering -----
   */

  return (
    <TextDropdown
      options={options}
      placeholder="Search Jobsites"
      onOptionSelection={(value) => {
        setSearchString(value.label);
        jobsiteSelected({
          _id: value.value,
        });
        setFoundJobsites([]);
      }}
      handleSubmit={() => {
        if (handleSubmit) handleSubmit(searchString);
      }}
      autoComplete="off"
      selectOptionsWithEnter
      isLoading={loading}
      {...props}
      onChange={(e) => handleChange(e.target.value)}
      value={searchString}
    />
  );
};

export default JobsiteSearch;
