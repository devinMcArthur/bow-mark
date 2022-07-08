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

  const wsLink = process.browser
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

  const splitLink = process.browser
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === "OperationDefinition" &&
            definition.operation === "subscription"
          );
        },
        wsLink!,
        authLink.concat(httpLink)
      )
    : httpLink;

  const client = new ApolloClient({
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
      },
    }),
    connectToDevTools: true,
  });

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
