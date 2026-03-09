import Breadcrumbs from "../components/Common/Breadcrumbs";
import Container from "../components/Common/Container";

const Reports = () => {
  return (
    <Container>
      <Breadcrumbs
        crumbs={[
          {
            title: "Reports",
            isCurrentPage: true,
          },
        ]}
      />
    </Container>
  );
};

export default Reports;
