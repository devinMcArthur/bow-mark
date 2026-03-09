import React from "react";
import {
  Box,
  BoxProps,
  Button,
  Checkbox,
  Flex,
  Heading,
  Radio,
  RadioGroup,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useAuth } from "../../../../contexts/Auth";
import Card from "../../../Common/Card";
import createLink from "../../../../utils/createLink";
import TextLink from "../../../Common/TextLink";
import Loading from "../../../Common/Loading";
import {
  CurrentUserDocument,
  FullUserSnippetFragment,
  UserHomeViewSettings,
  UserRoles,
  UserTypes,
  useUserUpdateHomeViewMutation,
  useUserUpdateSubscribedPrioritiesMutation,
  VehicleIssuePriority,
} from "../../../../generated/graphql";
import Permission from "../../../Common/Permission";
import vehicleIssuePriorityString from "../../../../utils/vehicleIssuePriorityString";

const HomeViewBox = ({
  user,
  value,
  isLoading,
  onChange,
  ...props
}: BoxProps & {
  user: FullUserSnippetFragment;
  value: UserHomeViewSettings;
  isLoading: boolean;
  onChange: (value: UserHomeViewSettings) => void;
}) => {
  /**
   * ----- Variables ----
   */

  const selected = React.useMemo(() => {
    return user.settings.homeView === value;
  }, [user.settings.homeView, value]);

  /**
   * ----- Rendering -----
   */

  return (
    <Flex
      flexDir="column"
      border="1px solid"
      borderColor={selected ? "gray.500" : "gray.200"}
      backgroundColor="gray.200"
      borderRadius={4}
      p={2}
      w={["45%", "15%"]}
      cursor="pointer"
      _hover={{ borderColor: "gray.500" }}
      onClick={() => {
        if (!isLoading && !selected) onChange(value);
      }}
    >
      <Box backgroundColor="gray.100" borderRadius={4}>
        {props.children}
      </Box>
      <Flex justifyContent="center">
        <RadioGroup value={user.settings.homeView} mt={2}>
          <Radio value={value} backgroundColor="white" />
        </RadioGroup>
      </Flex>
    </Flex>
  );
};

const ProfileSettings = () => {
  /**
   * ----- Hook Initialization -----
   */

  const {
    state: { user },
  } = useAuth();

  const toast = useToast();

  const [updateHomeView, { loading }] = useUserUpdateHomeViewMutation({
    refetchQueries: [CurrentUserDocument],
  });

  const [updateSubscribedPriorities, { loading: prioritiesLoading }] =
    useUserUpdateSubscribedPrioritiesMutation();

  const [subscribedPriorities, setSubscribedPriorities] = React.useState<
    VehicleIssuePriority[]
  >(user?.settings.subscribedVehicleIssuePriorities || []);

  /**
   * --- Functions ---
   */

  const toggleEmployee = React.useCallback(
    (priority: VehicleIssuePriority) => {
      const copy: VehicleIssuePriority[] = JSON.parse(
        JSON.stringify(subscribedPriorities)
      );

      const existingIndex = copy.findIndex((item) => item === priority);

      if (existingIndex === -1) copy.push(priority);
      else copy.splice(existingIndex, 1);

      setSubscribedPriorities(copy);
    },
    [subscribedPriorities]
  );

  const handlePrioritiesUpdate = React.useCallback(async () => {
    try {
      const result = await updateSubscribedPriorities({
        variables: {
          priorities: subscribedPriorities,
        },
      });

      if (result.data?.userUpdateSubscribedPriorities) {
        toast({
          title: "Success",
          description: "Subscribed priorities has been updated",
          isClosable: true,
          status: "success",
        });
      } else {
        toast({
          title: "Error",
          description: "Something went wrong, please try again",
          isClosable: true,
          status: "error",
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message,
        isClosable: true,
        status: "error",
      });
    }
  }, [subscribedPriorities, toast, updateSubscribedPriorities]);

  /**
   * --- Lifecycle ---
   */

  React.useEffect(() => {
    if (user)
      setSubscribedPriorities(user.settings.subscribedVehicleIssuePriorities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * ----- Rendering -----
   */

  return React.useMemo(() => {
    if (user) {
      return (
        <Box>
          <Heading>{user.name}</Heading>
          <Card heading={<Heading size="md">Employee</Heading>}>
            <TextLink link={createLink.employee(user.employee._id)}>
              {user.employee.name}
              {!!user.employee.jobTitle && <> - {user.employee.jobTitle}</>}
            </TextLink>
          </Card>
          <Card heading={<Heading size="md">Settings</Heading>}>
            <Text fontWeight="bold">Home View</Text>

            <Flex flexDir="row" justifyContent="space-evenly" w="100%">
              <HomeViewBox
                isLoading={loading}
                user={user}
                value={UserHomeViewSettings.DailyReports}
                onChange={(value) => {
                  updateHomeView({
                    variables: {
                      homeView: value as UserHomeViewSettings,
                    },
                  });
                }}
              >
                <Text fontWeight="bold" textAlign="center" my={6}>
                  Daily Reports
                </Text>
              </HomeViewBox>
              <Permission minRole={UserRoles.ProjectManager}>
                <HomeViewBox
                  isLoading={loading}
                  user={user}
                  value={UserHomeViewSettings.GeneralReports}
                  onChange={(value) => {
                    updateHomeView({
                      variables: {
                        homeView: value as UserHomeViewSettings,
                      },
                    });
                  }}
                >
                  <Text fontWeight="bold" textAlign="center" my={6}>
                    Reports
                  </Text>
                </HomeViewBox>
              </Permission>
            </Flex>

            <Permission
              minRole={UserRoles.ProjectManager}
              type={UserTypes.VehicleMaintenance}
            >
              <Heading mt={2} size="sm">
                Issue Priority Subscription
              </Heading>
              <Box p={2} backgroundColor="gray.100" borderRadius={6} my={2}>
                <Flex flexDir="column">
                  {(
                    Object.keys(VehicleIssuePriority) as Array<
                      keyof typeof VehicleIssuePriority
                    >
                  ).map((key) => (
                    <Checkbox
                      isChecked={subscribedPriorities.includes(
                        key as VehicleIssuePriority
                      )}
                      onChange={() =>
                        toggleEmployee(key as VehicleIssuePriority)
                      }
                      key={key}
                      isDisabled={prioritiesLoading}
                    >
                      {vehicleIssuePriorityString(key as VehicleIssuePriority)}
                    </Checkbox>
                  ))}
                  <Button
                    m="auto"
                    ml={0}
                    my={1}
                    backgroundColor="grey.300"
                    onClick={() => handlePrioritiesUpdate()}
                  >
                    Save
                  </Button>
                </Flex>
              </Box>
            </Permission>
          </Card>
        </Box>
      );
    } else {
      return <Loading />;
    }
  }, [
    handlePrioritiesUpdate,
    loading,
    prioritiesLoading,
    subscribedPriorities,
    toggleEmployee,
    updateHomeView,
    user,
  ]);
};

export default ProfileSettings;
