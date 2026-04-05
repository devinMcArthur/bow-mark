import { Box } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/Auth";
import createLink from "../../../utils/createLink";
import GeneralSearch from "../../Search/GeneralSearch";

const NavbarSearch = ({ autoFocus }: { autoFocus?: boolean }) => {
  const router = useRouter();

  const {
    state: { user },
  } = useAuth();

  return (
    <Box>
      {user && (
        <GeneralSearch
          placeholder="Search . . ."
          autoFocus={autoFocus}
          handleSubmit={(value) => {
            router.push(`/search?search_string=${value}`);
          }}
          itemSelected={(value, extraData) => {
            if (!extraData) return;
            switch (extraData.type) {
              case "employee":
                router.push(createLink.employee(value.value));
                break;
              case "vehicle":
                router.push(createLink.vehicle(value.value));
                break;
              case "jobsite":
                router.push(createLink.jobsite(value.value));
                break;
              case "dailyReport":
                router.push(createLink.dailyReport(value.value));
                break;
              case "crew":
                router.push(createLink.crew(value.value));
                break;
              case "company":
                router.push(createLink.company(value.value));
                break;
            }
          }}
          backgroundColor="whiteAlpha.100"
          borderColor="whiteAlpha.200"
          color="white"
          _placeholder={{ color: "whiteAlpha.500" }}
          _hover={{ borderColor: "whiteAlpha.400" }}
          _focus={{ borderColor: "red.400", boxShadow: "none", backgroundColor: "whiteAlpha.200" }}
          size="sm"
          dropdownProps={{
            backgroundColor: "#334155",
            borderColor: "whiteAlpha.200",
            color: "white",
          }}
        />
      )}
    </Box>
  );
};

export default NavbarSearch;
