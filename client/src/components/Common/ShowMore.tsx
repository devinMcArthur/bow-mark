import { Box, Button, Center, Flex } from "@chakra-ui/react";
import React from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { ICard } from "./Card";

interface IShowMore extends ICard {
  list: React.ReactNode[];
  limit?: number;
  /**
   * When set, ShowMore renders a fixed-height flex column: the list
   * scrolls internally and the Show more/less button stays pinned at
   * the bottom so it's always reachable. Without maxH, the button
   * appears inline at the end of the list (legacy behavior).
   */
  maxH?: string;
}

const ShowMore = ({ list, limit = 3, maxH }: IShowMore) => {
  const [collapsed, setCollapsed] = React.useState(true);
  const visible = collapsed ? list.slice(0, limit) : list;
  const hasOverflow = list.length > limit;

  if (maxH) {
    // Fixed height when the list is long enough to need Show more/less —
    // keeps the card the same size whether collapsed or expanded, so
    // toggling never reflows the page. Short lists (≤ limit, no
    // overflow) grow naturally so we don't leave empty whitespace.
    return (
      <Flex
        flexDir="column"
        h={hasOverflow ? maxH : undefined}
        maxH={maxH}
        minH={0}
      >
        {/* Small inset padding so child cards' drop shadows aren't
            clipped on the left/right/bottom edges of the scroll box. */}
        <Box flex="1" minH={0} overflowY="auto" px={1} pb={1}>
          {visible}
        </Box>
        {hasOverflow && (
          <Center flexShrink={0} py={2}>
            <Button
              leftIcon={collapsed ? <FiChevronDown /> : <FiChevronUp />}
              rightIcon={collapsed ? <FiChevronDown /> : <FiChevronUp />}
              size="xs"
              fontWeight="normal"
              color="gray.600"
              p={0}
              variant="ghost"
              onClick={() => setCollapsed(!collapsed)}
              _focus={{ border: "none" }}
            >
              Show {collapsed ? "more" : "less"}
            </Button>
          </Center>
        )}
      </Flex>
    );
  }

  // Legacy inline layout — grows to fit, button at end of list.
  return (
    <Box>
      <Box>{visible}</Box>
      {hasOverflow && (
        <Center>
          <Button
            leftIcon={collapsed ? <FiChevronDown /> : <FiChevronUp />}
            rightIcon={collapsed ? <FiChevronDown /> : <FiChevronUp />}
            mt={2}
            size="xs"
            fontWeight="normal"
            color="gray.600"
            p={0}
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            _focus={{ border: "none" }}
          >
            Show {collapsed ? "more" : "less"}
          </Button>
        </Center>
      )}
    </Box>
  );
};

export default ShowMore;
