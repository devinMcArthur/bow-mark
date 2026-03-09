import React from "react";

import {
  Box,
  Button,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useAuth } from "../contexts/Auth";
import { useForgotPasswordForm, useUserLoginForm } from "../forms/user";
import {
  LoginData,
  useLoginMutation,
  useUserPasswordResetRequestMutation,
} from "../generated/graphql";
import { useRouter } from "next/router";
import SubmitButton from "../components/Common/forms/SubmitButton";

const Login = () => {
  /**
   * ----- Hook Initialization -----
   */

  const router = useRouter();

  const {
    login,
    state: { user },
  } = useAuth();

  const toast = useToast();

  const [loginMutation, { loading: loginLoading }] = useLoginMutation();

  const [forgotPassword, { loading: forgotPasswordLoading }] =
    useUserPasswordResetRequestMutation();

  const { FormComponents: LoginFormComponents, setError: setLoginError } =
    useUserLoginForm();

  const { FormComponents: ForgotPasswordComponents } = useForgotPasswordForm();

  const { isOpen, onOpen, onClose } = useDisclosure();

  /**
   * ----- Functions -----
   */

  const submitLogin = React.useCallback(
    async (data: LoginData) => {
      try {
        const result = await loginMutation({
          variables: { data },
        });

        if (result.data?.login) login(result.data.login);
      } catch (e: any) {
        setLoginError("email", { message: e.message }, { shouldFocus: true });
      }
    },
    [login, loginMutation, setLoginError]
  );

  const submitForgotPassword = React.useCallback(
    async (data: { email: string }) => {
      try {
        const result = await forgotPassword({
          variables: {
            email: data.email,
          },
        });

        if (result.data?.userPasswordResetRequest) {
          toast({
            title: "Success",
            description:
              "Please follow the instructions in the email you've received to reset your password",
            isClosable: true,
            status: "success",
          });
          onClose();
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
    },
    [forgotPassword, toast, onClose]
  );

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (!!user) router.push("/");
  }, [router, user]);

  return (
    <Box
      m="auto"
      p={6}
      w={["75%", "50%", "50%", "50%", "25%"]}
      backgroundColor="white"
      mt="10%"
      border="1px solid lightgray"
      borderRadius={6}
    >
      <LoginFormComponents.Form submitHandler={submitLogin}>
        <Heading textAlign="center">Login</Heading>
        <LoginFormComponents.Email isLoading={loginLoading} />
        <LoginFormComponents.Password isLoading={loginLoading} />
        <SimpleGrid spacing={2} mt={2} columns={[1, 1, 2]}>
          <LoginFormComponents.RememberMe isLoading={loginLoading} />
          <Flex justifyContent={[null, null, "end"]}>
            <Button variant="link" onClick={onOpen}>
              Forgot Password
            </Button>
          </Flex>
        </SimpleGrid>
        <SubmitButton isLoading={loginLoading} />
      </LoginFormComponents.Form>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Forgot Password</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <ForgotPasswordComponents.Form submitHandler={submitForgotPassword}>
              <ForgotPasswordComponents.Email
                isLoading={forgotPasswordLoading}
              />
              <SubmitButton isLoading={forgotPasswordLoading} />
            </ForgotPasswordComponents.Form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Login;
