import ClientOnly from "../../components/Common/ClientOnly";
import Container from "../../components/Common/Container";
import JobsiteTruckingRateSettingsClientContent from "../../components/pages/settings/trucking-rates/ClientContent";

const JobsiteTruckingRateSettings = () => {
  return (
    <Container>
      <ClientOnly>
        <JobsiteTruckingRateSettingsClientContent />
      </ClientOnly>
    </Container>
  );
};

export default JobsiteTruckingRateSettings;
