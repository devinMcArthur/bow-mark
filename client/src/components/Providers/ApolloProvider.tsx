import * as React from "react";

import { createUploadLink } from "apollo-upload-client";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  split,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { setContext } from "@apollo/client/link/context";
import { localStorageTokenKey } from "../../contexts/Auth";
import useStorage from "../../hooks/useStorage";
import { getMainDefinition } from "@apollo/client/utilities";

export default function MyApolloProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getItem } = useStorage();

  const token = getItem(localStorageTokenKey);

  const httpLink = createUploadLink({
    uri: process.env.NEXT_PUBLIC_API_URL,
  });

  const wsLink = typeof window !== "undefined"
    ? new GraphQLWsLink(
        createClient({
          url: process.env.NEXT_PUBLIC_WS_API_URL as string,
          connectionParams: {
            Authorization:
              localStorage.getItem(localStorageTokenKey) || token || "",
          },
        })
      )
    : null;

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization:
          localStorage.getItem(localStorageTokenKey) || token || "",
      },
    };
  });

  const splitLink = typeof window !== "undefined"
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === "OperationDefinition" &&
            definition.operation === "subscription"
          );
        },
        wsLink!,
        // @ts-expect-error - type imcompatibilities between `apollo-upload-client` and `@apollo/client`
        authLink.concat(httpLink)
      )
    : httpLink;

  const client = new ApolloClient({
    // @ts-expect-error - type imcompatibilities between `apollo-upload-client` and `@apollo/client`
    link: splitLink,
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            dailyReports: {
              keyArgs: [],
              merge: (existing = [], incoming) => {
                return [...existing, ...incoming];
              },
            },
            dailyReportsForJobsite: {
              keyArgs: [],
              merge: (existing = [], incoming) => {
                return [...existing, ...incoming];
              },
            },
            materials: {
              keyArgs: [],
              merge: (existing = [], incoming) => {
                return [...existing, ...incoming];
              },
            },
            jobsites: {
              keyArgs: [],
              merge: (existing = [], incoming) => {
                return [...existing, ...incoming];
              },
            },
          },
        },
        // Embedded subdocs on RateBuildupTemplate have an `id` field that is
        // only unique within a single template, not globally. Without this,
        // Apollo merges objects with the same __typename:id across templates.
        RateBuildupGroupDef: { keyFields: false },
        RateBuildupControllerDef: { keyFields: false },
        RateBuildupControllerOption: { keyFields: false },
        RateBuildupParameterDef: { keyFields: false },
        RateBuildupTableDef: { keyFields: false },
        RateBuildupRateEntry: { keyFields: false },
        RateBuildupFormulaStep: { keyFields: false },
        RateBuildupBreakdownDef: { keyFields: false },
        RateBuildupOutputDef: { keyFields: false },
      },
    }),
    connectToDevTools: true,
  });

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
