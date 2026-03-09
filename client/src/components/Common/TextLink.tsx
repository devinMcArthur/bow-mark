import * as React from "react";
import { Link as ChakraLink } from "@chakra-ui/react";
import { LinkProps } from "@chakra-ui/layout";
import Link from "next/link";

interface ITextLink extends LinkProps {
  children: React.ReactNode;
  link: string;
  title?: string;
  isExternal?: boolean;
  newTab?: boolean;
}

const TextLink = ({
  title,
  link,
  children,
  isExternal,
  newTab,
  ...rest
}: ITextLink) => {
  const linkProps: any = {
    color: "blue.600",
  };

  const activeAndFocusProps = {
    outline: 0,
    border: "none",
    MozOutlineStyle: "none",
  };

  let newTabProps = {};
  if (newTab) {
    newTabProps = {
      target: "_blank",
      rel: "noopener noreferrer",
    };
  }

  let content = (
    <Link href={link} passHref>
      <ChakraLink
        _active={activeAndFocusProps}
        _focus={activeAndFocusProps}
        {...linkProps}
        {...newTabProps}
        {...rest}
      >
        {children}
      </ChakraLink>
    </Link>
  );
  if (isExternal) {
    content = (
      <ChakraLink
        _active={activeAndFocusProps}
        _focus={activeAndFocusProps}
        href={link}
        title={title}
        isExternal
        {...linkProps}
        {...newTabProps}
        {...rest}
      >
        {children}
      </ChakraLink>
    );
  }

  return content;
};

export default TextLink;
