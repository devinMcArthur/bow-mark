import { Box } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/Auth";
import createLink from "../../../utils/createLink";
import GeneralSearch from "../../Search/GeneralSearch";

const NavbarSearch = () => {
  const router = useRouter();

  const {
    state: { user },
  } = useAuth();

  return (
    <Box p="auto" w={["50%", "50%"]} mx={2}>
      {user && (
        <GeneralSearch
          mt={1}
          placeholder="Search . . ."
          handleSubmit={(value) => {
            router.push(`/search?search_string=${value}`);
          }}
          itemSelected={(value, extraData) => {
            if (!extraData) {
              // eslint-disable-next-line no-console
              console.warn("Internal error: no extra data found");
              return;
            }

            switch (extraData.type) {
              case "employee": {
                router.push(createLink.employee(value.value));
                break;
              }
              case "vehicle": {
                router.push(createLink.vehicle(value.value));
                break;
              }
              case "jobsite": {
                router.push(createLink.jobsite(value.value));
                break;
              }
              case "dailyReport": {
                router.push(createLink.dailyReport(value.value));
                break;
              }
              case "crew": {
                router.push(createLink.crew(value.value));
                break;
              }
              case "company": {
                router.push(createLink.company(value.value));
                break;
              }
            }
          }}
          _focus={{ boxShadow: "none" }}
        />
      )}
    </Box>
  );
};

export default NavbarSearch;
