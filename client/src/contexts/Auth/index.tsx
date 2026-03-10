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
  serverUnreachable: boolean;
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
  }
  | {
    type: "server-unreachable";
  }
  | {
    type: "server-reachable";
  };

/**
 * ----- Initialize Variables -----
 */

export const localStorageTokenKey = "token";

const initialState: IAuthState = {
  user: undefined,
  serverUnreachable: false,
};

const AuthContext = React.createContext<IAuthContext | undefined>(undefined);

/**
 * ----- Reducer -----
 */

const AuthReducer = (_draft: IAuthState, action: IAuthAction): IAuthState => {
  switch (action.type) {
    case "authorize-session": {
      return {
        user: action.payload.user,
        serverUnreachable: false,
      };
    }
    case "deauthorize-session": {
      return {
        user: null,
        serverUnreachable: false,
      };
    }
    case "session-loading": {
      return {
        user: undefined,
        serverUnreachable: false,
      };
    }
    case "server-unreachable": {
      return {
        ..._draft,
        serverUnreachable: true,
      };
    }
    case "server-reachable": {
      return {
        ..._draft,
        serverUnreachable: false,
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

  const retryRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
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
      } catch { }
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
      // If networkError has a statusCode the server responded (e.g. 400/500
      // from a bad JWT) — it IS reachable, just rejecting the request.
      // Only dispatch server-unreachable when there is no HTTP response at all
      // (connection refused, DNS failure, etc.).
      const isGenuineNetworkFailure =
        currentUserError.networkError &&
        !("statusCode" in currentUserError.networkError);
      if (isGenuineNetworkFailure) {
        dispatch({ type: "server-unreachable" });
        if (!retryRef.current) {
          retryRef.current = setInterval(() => {
            fetchUser();
          }, 10000);
        }
      } else {
        deauthorizeSession();
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
    dispatch,
    fetchUser,
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
