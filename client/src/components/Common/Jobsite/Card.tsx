import { Text } from "@chakra-ui/react";
import { JobsiteCardSnippetFragment } from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import Card from "../Card";
import TextGrid from "../TextGrid";
import TextLink from "../TextLink";

interface IJobsiteCard {
  jobsite: JobsiteCardSnippetFragment;
}

const JobsiteCard = ({ jobsite }: IJobsiteCard) => {
  return (
    <Card
      heading={
        <TextLink
          link={createLink.jobsite(jobsite._id)}
          color="black"
          fontWeight="bold"
          fontSize="lg"
        >
          {jobsite.name}
        </TextLink>
      }
    >
      <TextGrid
        rows={[
          {
            title: <Text fontWeight="bold">Job Number: </Text>,
            text: jobsite.jobcode,
          },
        ]}
      />
    </Card>
  );
};

export default JobsiteCard;
