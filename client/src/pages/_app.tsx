import React from "react";

import { AppProps } from "next/dist/shared/lib/router/router";
import Provider from "../components/Providers";
import Navbar from "../components/Navbar";
import MainPageContainer from "../components/Common/MainPageContainer";
import Head from "next/head";

import "../../public/global.css";
import "reactflow/dist/style.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider>
      <Head>
        <title>
          {process.env.NODE_ENV !== "production" ? "[Dev] " : ""}BM
          {process.env.NEXT_PUBLIC_APP_NAME &&
            ` ${process.env.NEXT_PUBLIC_APP_NAME}`}
        </title>
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no"
        />
      </Head>
      <Navbar />
      <MainPageContainer>
        {React.createElement(Component, pageProps)}
      </MainPageContainer>
    </Provider>
  );
}
