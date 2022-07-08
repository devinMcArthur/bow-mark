import { useToast } from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";

import { useImmerReducer } from "use-immer";

import {
  FullUserSnippetFragment,
  useCurrentUserLazyQuery,
} from "../../generated/graphql";
import useStorage from "../../hooks/useStorage";

/**
 * ----- Types -----
 */

interface IAuthProvider {
  children: React.ReactNode;
}

interface IAuthState {
  user: FullUserSnippetFragment | undefined | null;
}

interface IAuthContext {
  state: IAuthState;

  login: (jwt: string) => void;
  logout: () => void;
}

type IAuthAction =
  | {
      type: "deauthorize-session";
    }
  | {
      type: "authorize-session";
      payload: {
        user: FullUserSnippetFragment;
      };
    }
  | {
      type: "session-loading";
    };

/**
 * ----- Initialize Variables -----
 */

export const localStorageTokenKey = "token";

const initialState: IAuthState = {
  user: undefined,
};

const AuthContext = React.createContext<IAuthContext | undefined>(undefined);

/**
 * ----- Reducer -----
 */

const AuthReducer = (draft: IAuthState, action: IAuthAction): IAuthState => {
  switch (action.type) {
    case "authorize-session": {
      return {
        user: action.payload.user,
      };
    }
    case "deauthorize-session": {
      return {
        user: null,
      };
    }
    case "session-loading": {
      return {
        user: undefined,
      };
    }
  }
};

const AuthProvider = ({ children }: IAuthProvider) => {
  const [state, dispatch] = useImmerReducer(AuthReducer, initialState);

  const { getItem, setItem, removeItem } = useStorage();

  /**
   * ----- State Initialization -----
   */

  const [token, setToken] = React.useState(
    getItem(localStorageTokenKey) || null
  );

  /**
   * ----- Hook Initialization -----
   */

  const router = useRouter();

  const toast = useToast();

  const [
    currentUser,
    {
      data: currentUserData,
      loading: currentUserLoading,
      error: currentUserError,
      networkStatus: currentUserNetworkStatus,
      refetch: currentUserRefetch,
    },
  ] = useCurrentUserLazyQuery({ notifyOnNetworkStatusChange: true });

  /**
   * ----- Functions -----
   */

  const login: IAuthContext["login"] = React.useCallback((jwt) => {
    setToken(jwt);
  }, []);

  const logout: IAuthContext["logout"] = React.useCallback(() => {
    setToken(null);
  }, []);

  const authorizeSession = React.useCallback(
    (user: FullUserSnippetFragment) => {
      dispatch({
        type: "authorize-session",
        payload: {
          user,
        },
      });
    },
    [dispatch]
  );

  const sessionLoading = React.useCallback(() => {
    dispatch({
      type: "session-loading",
    });
  }, [dispatch]);

  const deauthorizeSession = React.useCallback(() => {
    setToken(null);
    dispatch({
      type: "deauthorize-session",
    });
  }, [dispatch]);

  const fetchUser = React.useCallback(async () => {
    if (currentUserRefetch) {
      try {
        const res = await currentUserRefetch();
        if (res.data.currentUser) authorizeSession(res.data.currentUser);
      } catch {}
    } else {
      currentUser();
    }
  }, [authorizeSession, currentUser, currentUserRefetch]);

  /**
   * ----- Use-effects and other logic -----
   */

  // Handle currentUserQuery
  React.useEffect(() => {
    if (currentUserData?.currentUser && !currentUserLoading)
      authorizeSession(currentUserData.currentUser);
    else if (currentUserLoading) sessionLoading();
    else if (!currentUserLoading && currentUserError) {
      if (currentUserError.message !== "Failed to fetch") {
        deauthorizeSession();
      } else {
        toast({
          title: "Error",
          description:
            "Unable to connect to the server. If the problem persists, please contact support.",
          status: "error",
          isClosable: true,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentUserData,
    currentUserLoading,
    currentUserError,
    currentUserNetworkStatus,
    authorizeSession,
    sessionLoading,
    deauthorizeSession,
  ]);

  // Handle token changes
  const localStorageToken = getItem(localStorageTokenKey);
  React.useEffect(() => {
    if (token && localStorageToken && !state.user) {
      fetchUser();
    } else if (token && !localStorageToken) {
      setItem(localStorageTokenKey, token);
      if (!state.user) fetchUser();
    } else if (!token && localStorageToken) {
      removeItem(localStorageTokenKey);
      deauthorizeSession();
    } else if (!token && !localStorageToken) {
      deauthorizeSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deauthorizeSession, state.user, token, localStorageToken]);

  /**
   * @desc go to login page if not logged in
   */
  React.useEffect(() => {
    if (
      state.user === null &&
      router.pathname !== "/login" &&
      !router.pathname.includes("/signup") &&
      !router.pathname.includes("/password-reset")
    ) {
      router.push("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user, router.pathname]);

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(AuthContext);

  if (context === undefined)
    throw new Error(
      "useAuth can only be used in a component wrapped by AuthProvider"
    );

  return context;
};

export { AuthProvider, useAuth };
