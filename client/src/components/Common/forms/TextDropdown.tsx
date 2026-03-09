import React from "react";

import { useOutsideClick } from "@chakra-ui/hooks";
import { Box, BoxProps, Heading, Stack } from "@chakra-ui/layout";
import TextField, { ITextField } from "./TextField";
import TextLink from "../TextLink";
import Loading from "../Loading";

export interface IOptions<ExtraData> {
  value: string;
  label: string;
  extraData?: ExtraData;
}

export interface IGroupedOptions<ExtraData> {
  [key: string]: IOptions<ExtraData>[];
}

interface ITextDropdown<ExtraData> extends ITextField {
  options?: IOptions<ExtraData>[];
  groupedOptions?: { [key: string]: IOptions<ExtraData>[] };
  onOptionSelection: (
    choice: { value: string; label: string },
    extraData?: ExtraData
  ) => void;
  handleSubmit?: () => void;
  containerId?: string;
  dropdownProps?: BoxProps;
  selectOptionsWithEnter?: boolean;
  isLoading?: boolean;
}

const TextDropdown = <ExtraData extends object>({
  options,
  groupedOptions,
  onOptionSelection,
  handleSubmit,
  containerId,
  dropdownProps,
  selectOptionsWithEnter = false,
  isLoading,
  ...props
}: ITextDropdown<ExtraData>) => {
  /**
   * ----- Initialize Hooks -----
   */

  const inputRef = React.useRef<HTMLInputElement>(null);

  const [dropdown, setDropdown] = React.useState(false);

  const [selectedIndex, setSelectedIndex] = React.useState<number>();

  useOutsideClick({
    ref: inputRef,
    handler: () => setDropdown(false),
  });

  /**
   * ----- Variables -----
   */

  const groupedOptionsLengthArray = React.useMemo(() => {
    let array: number[] | undefined = undefined;

    if (groupedOptions) {
      array = [];
      for (let i = 0; i < Object.values(groupedOptions).length; i++) {
        array.push(Object.values(groupedOptions)[i].length || 0);
      }
    }

    return array;
  }, [groupedOptions]);

  const optionsLength = React.useMemo(() => {
    if (options && options.length > 0) {
      return options.length;
    } else if (groupedOptionsLengthArray) {
      return groupedOptionsLengthArray.reduce((a, b) => a + b);
    } else return 0;
  }, [options, groupedOptionsLengthArray]);

  /**
   * ----- Functions -----
   */

  const handleOptionSelection = React.useCallback(
    (option: IOptions<ExtraData>, extraData?: ExtraData) => {
      setDropdown(false);
      onOptionSelection(option, extraData);
    },
    [onOptionSelection]
  );

  const scrollToOption = React.useCallback((index?: number) => {
    if (index !== undefined) {
      // scroll to the previous option so the option remains visible
      const element = document.getElementById(`option-${index - 1}`);
      if (element) element.scrollIntoView();
    }
  }, []);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (optionsLength > 0) {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();

          let newSelectedIndex = undefined;
          if (selectedIndex === undefined) newSelectedIndex = 0;
          else if (selectedIndex !== optionsLength - 1)
            newSelectedIndex = selectedIndex + 1;
          else newSelectedIndex = optionsLength - 1;

          setSelectedIndex(newSelectedIndex);
          scrollToOption(newSelectedIndex);

          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (selectedIndex !== undefined) {
            let newIndex = undefined;

            if (selectedIndex !== 0) {
              newIndex = selectedIndex - 1;
            }

            setSelectedIndex(newIndex);

            if (newIndex === undefined) {
              // Scroll to top
              document.getElementById("options-container")?.scrollTo({
                top: 0,
              });
            } else scrollToOption(newIndex);
          }

          break;
        }
        case "Enter": {
          if (selectOptionsWithEnter) {
            if (selectedIndex !== undefined) {
              e.preventDefault();

              if (options && options.length > 0) {
                handleOptionSelection(
                  options[selectedIndex],
                  options[selectedIndex].extraData
                );
              } else if (groupedOptionsLengthArray && groupedOptions) {
                let skippedIndices = 0;
                for (let i = 0; i < groupedOptionsLengthArray.length; i++) {
                  if (
                    groupedOptionsLengthArray[i] !== 0 &&
                    selectedIndex <=
                      groupedOptionsLengthArray[i] - 1 + skippedIndices
                  ) {
                    handleOptionSelection(
                      Object.values(groupedOptions)[i][
                        selectedIndex - skippedIndices
                      ],
                      Object.values(groupedOptions)[i][
                        selectedIndex - skippedIndices
                      ].extraData
                    );
                    break;
                  } else skippedIndices += groupedOptionsLengthArray[i];
                }
              }
            }
          }
        }
      }
    }
  };

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (!dropdown) setSelectedIndex(undefined);
  }, [dropdown]);

  React.useEffect(() => {
    setSelectedIndex(undefined);
  }, [options, groupedOptions]);

  const groupedOptionsPopulated = React.useMemo(() => {
    let populated = false;
    if (groupedOptions)
      for (let i = 0; i < Object.values(groupedOptions).length; i++) {
        if (
          Object.values(groupedOptions)[i] &&
          Object.values(groupedOptions)[i].length > 0
        )
          populated = true;
      }

    return populated;
  }, [groupedOptions]);

  /**
   * ----- Rendering -----
   */

  const dropdownJSX = React.useMemo(() => {
    let rootIndex = 0;
    if (isLoading && (!options || options?.length === 0)) {
      return (
        <Box
          id="options-container"
          borderRadius="0 0 0.375rem 0.375rem"
          position="absolute"
          top={
            `${
              (inputRef.current?.getBoundingClientRect().height || 8) / 1.09
            }px` || "2.25em"
          }
          border="1px solid"
          borderColor="inherit"
          borderTop="none"
          paddingTop={2}
          zIndex={9999}
          backgroundColor="white"
          w="100%"
          maxH="25vh"
          minH="3em"
          overflowY="scroll"
          {...dropdownProps}
        >
          <Box
            h="1px"
            w="95%"
            backgroundColor="gray.400"
            mx="auto"
            mb={2}
          ></Box>
          <Loading my="auto" />
        </Box>
      );
    } else if (dropdown && groupedOptionsPopulated) {
      return (
        <Box
          id="options-container"
          borderRadius="0 0 0.375rem 0.375rem"
          position="absolute"
          top={
            `${
              (inputRef.current?.getBoundingClientRect().height || 8) / 1.09
            }px` || "2.25em"
          }
          border="1px solid"
          borderColor="inherit"
          borderTop="none"
          paddingTop={2}
          zIndex={9999}
          backgroundColor="white"
          w="100%"
          maxH="25vh"
          overflowY="scroll"
          {...dropdownProps}
        >
          <Box
            h="1px"
            w="95%"
            backgroundColor="gray.400"
            mx="auto"
            mb={2}
          ></Box>
          <Stack>
            {Object.values(groupedOptions!).map((value, i) => {
              if (value && value.length > 0)
                return (
                  <Box key={i}>
                    <Heading
                      size="sm"
                      w="100%"
                      backgroundColor="gray.300"
                      p={2}
                    >
                      {Object.keys(groupedOptions!)[i].toUpperCase()}
                    </Heading>
                    <Stack>
                      {value.map((option) => {
                        const index = rootIndex;
                        rootIndex += 1;

                        return (
                          <Box
                            id={`option-${index}`}
                            as="span"
                            cursor="pointer"
                            onMouseOver={() => {
                              setSelectedIndex(index);
                            }}
                            onMouseLeave={() => setSelectedIndex(undefined)}
                            padding={1}
                            paddingLeft="1rem"
                            onClick={() => {
                              setDropdown(false);
                              handleOptionSelection(option, option.extraData);
                            }}
                            key={index}
                            fontWeight={index === selectedIndex ? "bold" : ""}
                          >
                            {/** @ts-expect-error */}
                            {!!option.extraData?.link ? (
                              <TextLink
                                // @ts-expect-error
                                link={option.extraData.link || ""}
                                color="black"
                              >
                                {option.label}
                              </TextLink>
                            ) : (
                              option.label
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                );
              else return null;
            })}
          </Stack>
        </Box>
      );
    } else if (dropdown && options && options.length > 0) {
      return (
        <Box
          id="options-container"
          borderRadius="0 0 0.375rem 0.375rem"
          position="absolute"
          top={
            `${
              (inputRef.current?.getBoundingClientRect().height || 8) / 1.09
            }px` || "2.25em"
          }
          border="1px solid"
          borderColor="inherit"
          borderTop="none"
          paddingTop={2}
          zIndex={9999}
          backgroundColor="white"
          w="100%"
          maxH="25vh"
          overflowY="scroll"
          {...dropdownProps}
        >
          <Box
            h="1px"
            w="95%"
            backgroundColor="gray.400"
            mx="auto"
            mb={2}
          ></Box>
          <Stack>
            {options.map((option, index) => (
              <Box
                as="span"
                cursor="pointer"
                id={`option-${index}`}
                onMouseOver={() => setSelectedIndex(index)}
                onMouseLeave={() => setSelectedIndex(undefined)}
                padding={1}
                paddingLeft="1rem"
                onClick={() => {
                  setDropdown(false);
                  handleOptionSelection(option, option.extraData);
                }}
                key={index}
                fontWeight={selectedIndex === index ? "bold" : ""}
              >
                {option.label}
              </Box>
            ))}
          </Stack>
        </Box>
      );
    }
  }, [
    dropdown,
    dropdownProps,
    groupedOptions,
    groupedOptionsPopulated,
    handleOptionSelection,
    isLoading,
    options,
    selectedIndex,
  ]);

  return (
    <div ref={inputRef} style={{ position: "relative" }} id={containerId}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setDropdown(false);
          if (handleSubmit) handleSubmit();
        }}
      >
        <TextField
          onClick={() => setDropdown(true)}
          onFocus={() => setDropdown(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          {...props}
        />
      </form>
      {dropdownJSX}
    </div>
  );
};

export default TextDropdown;
