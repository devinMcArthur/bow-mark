import React from "react";

import { Box, Heading, useToast } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import Card from "../components/Common/Card";
import Container from "../components/Common/Container";
import { useUserSignupForm } from "../forms/user";
import { PageSignupSsrComp, ssrSignupSsr } from "../generated/page";
import { SignupData, useSignupMutation } from "../generated/graphql";
import SubmitButton from "../components/Common/forms/SubmitButton";
import { useAuth } from "../contexts/Auth";
import { FiLogOut } from "react-icons/fi";
import { useRouter } from "next/router";

const Signup: PageSignupSsrComp = ({ data }) => {
  const signup = data?.signup!;

  /**
   * ----- Hook Initialization -----
   */

  const { login } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const { FormComponents } = useUserSignupForm({
    defaultValues: {
      name: signup.employee.name,
    },
  });

  const [userSignup, { loading }] = useSignupMutation();

  /**
   * ----- Functions -----
   */

  const submitHandler = React.useCallback(
    async (data: SignupData) => {
      try {
        const res = await userSignup({
          variables: {
            signupId: signup._id,
            data: {
              email: data.email,
              name: data.name,
              password: data.password,
            },
          },
        });

        if (res.data?.signup) {
          login(res.data.signup);
          router.push("/");
        } else throw new Error("Did not receive a token");
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error(e);

        toast({
          title: "Error",
          description: e.message,
          isClosable: true,
          status: "error",
        });
      }
    },
    [login, router, signup._id, toast, userSignup]
  );

  /**
   * ----- Rendering -----
   */

  return (
    <Box
      m="auto"
      p={6}
      w={["75%", "50%", "50%", "25%"]}
      backgroundColor="white"
      mt="10%"
      border="1px solid lightgray"
      borderRadius={6}
    >
      <Heading>Signup form for {signup.employee.name}</Heading>
      <FormComponents.Form submitHandler={submitHandler}>
        <FormComponents.Name isLoading={loading} />
        <FormComponents.Email isLoading={loading} />
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
  const res = await ssrSignupSsr.getServerPage(
    { variables: { id: ctx.query.id as string } },
    ctx
  );

  let notFound = false;
  if (!res.props.data.signup) notFound = true;

  return { ...res, notFound };
};

export default Signup;
