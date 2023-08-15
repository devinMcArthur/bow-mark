import { NextPage } from "next";
import React from "react";

import { createUploadLink } from "apollo-upload-client";
import {
  ApolloClient,
  NormalizedCacheObject,
  InMemoryCache,
  ApolloProvider,
} from "@apollo/client";
import {
  NextApiRequestCookies,
  // @ts-ignore This path is generated at build time and conflicts otherwise
} from "next-server/server/api-utils";
import { IncomingMessage } from "http";

export type ApolloClientContext = {
  req?: IncomingMessage & {
    cookies: NextApiRequestCookies;
  };
};

// eslint-disable-next-line react/display-name
export const withApollo = (Comp: NextPage) => (props: any) => {
  return (
    <ApolloProvider client={getApolloClient(undefined, props.apolloState)}>
      {React.createElement(Comp, {})}
    </ApolloProvider>
  );
};

export const getApolloClient = (
  ctx?: ApolloClientContext,
  initialState?: NormalizedCacheObject
) => {
  if (ctx && ctx.req) {
    let { req } = ctx;
    // Do something with the cookies here, maybe add a header for authentication
    req.cookies;
  }

  const httpLink = createUploadLink({
    uri: process.env.SSR_API_URL,
    fetch,
  });
  const cache = new InMemoryCache().restore(initialState || {});
  return new ApolloClient({
    // @ts-expect-error - type imcompatibilities between `apollo-upload-client` and `@apollo/client`
    link: httpLink,
    cache,
  });
};
