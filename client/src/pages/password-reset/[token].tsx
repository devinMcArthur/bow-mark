import React from "react";

import { Box, Heading, useToast } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import { useAuth } from "../../contexts/Auth";
import {
  PageUserForPasswordResetComp,
  ssrUserForPasswordReset,
} from "../../generated/page";
import { useRouter } from "next/router";
import { usePasswordResetForm } from "../../forms/user";
import { useUserPasswordResetMutation } from "../../generated/graphql";
import SubmitButton from "../../components/Common/forms/SubmitButton";

const PasswordReset: PageUserForPasswordResetComp = ({ data }) => {
  /**
   * ----- Hook Initialization -----
   */

  const {
    state: { user },
  } = useAuth();

  const toast = useToast();

  const router = useRouter();

  const { FormComponents } = usePasswordResetForm();

  const [resetPassword, { loading }] = useUserPasswordResetMutation();

  /**
   * ----- Use-effects and other logic
   */

  React.useEffect(() => {
    if (!!user) router.push("/");
  }, [router, user]);

  /**
   * ----- Rendering -----
   */

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
      <Heading size="md" mb={4}>
        Password reset for {data?.user?.name}
      </Heading>
      <FormComponents.Form
        submitHandler={async (data) => {
          try {
            const res = await resetPassword({
              variables: {
                password: data.password,
                token: window.__NEXT_DATA__.query.token as string,
              },
            });

            if (res.data?.userPasswordReset) {
              toast({
                title: "Success",
                description: "Password successfully updated",
                status: "success",
                isClosable: true,
              });
              router.push("/login");
            } else {
              toast({
                title: "Error",
                description: "Something went wrong",
                status: "error",
                isClosable: true,
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
        }}
      >
        <FormComponents.Password isLoading={loading} />
        <FormComponents.ConfirmPassword isLoading={loading} />
        <SubmitButton isLoading={loading} />
      </FormComponents.Form>
    </Box>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  params,
  ...ctx
}) => {
  const res = await ssrUserForPasswordReset.getServerPage(
    { variables: { query: { resetPasswordToken: params?.token as string } } },
    ctx
  );

  let notFound = false;
  if (!res.props.data.user) notFound = true;

  return { ...res, notFound };
};

export default PasswordReset;
