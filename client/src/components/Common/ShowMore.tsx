import { Box, Button, Center } from "@chakra-ui/react";
import React from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { ICard } from "./Card";

interface IShowMore extends ICard {
  list: React.ReactNode[];
  limit?: number;
}

const ShowMore = ({ list, limit = 3 }: IShowMore) => {
  const [collapsed, setShowAll] = React.useState(true);

  return (
    <Box>
      <Box>
        {list.map((item, index) => {
          if (!collapsed || index < limit) {
            return item;
          }
        })}
      </Box>
      {list.length > limit && (
        <Center>
          <Button
            leftIcon={collapsed ? <FiChevronDown /> : <FiChevronUp />}
            rightIcon={collapsed ? <FiChevronDown /> : <FiChevronUp />}
            mt={2}
            color="gray.600"
            p={0}
            variant="ghost"
            onClick={() => setShowAll(!collapsed)}
            _focus={{ border: "none" }}
          >
            show {collapsed ? "more" : "less"}
          </Button>
        </Center>
      )}
    </Box>
  );
};

export default ShowMore;
