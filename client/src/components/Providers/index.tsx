import * as React from "react";

import ThemeProvider from "./ThemeProvider";
import MyApolloProvider from "./ApolloProvider";
import { AuthProvider } from "../../contexts/Auth";
import { SystemProvider } from "../../contexts/System";
import { PanelProvider } from "../../contexts/Panel";

export default function Provider(props: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MyApolloProvider>
        <SystemProvider>
          <AuthProvider>
            <PanelProvider>{props.children}</PanelProvider>
          </AuthProvider>
        </SystemProvider>
      </MyApolloProvider>
    </ThemeProvider>
  );
}

export function withProvider(WrappedComponent: any) {
  return WrappedComponent;
}
