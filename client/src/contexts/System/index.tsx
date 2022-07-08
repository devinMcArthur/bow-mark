import { Center, Heading } from "@chakra-ui/react";
import React from "react";

import { useImmerReducer } from "use-immer";
import MainPageContainer from "../../components/Common/MainPageContainer";
import { SystemSnippetFragment, useSystemQuery } from "../../generated/graphql";

/**
 * ----- Types -----
 */

interface ISystemProvider {
  children: React.ReactNode;
}

interface ISystemState {
  system: SystemSnippetFragment | undefined | null;
}

interface ISystemContext {
  state: ISystemState;
}

type ISystemAction =
  | {
      type: "set-system";
      payload: {
        system: SystemSnippetFragment;
      };
    }
  | {
      type: "system-loading";
    }
  | {
      type: "system-not-found";
    };

/**
 * ----- Initialize Variables -----
 */

const initialState: ISystemState = {
  system: undefined,
};

const SystemContext = React.createContext<ISystemContext | undefined>(
  undefined
);

/**
 * ----- Reducer -----
 */

const SystemReducer = (
  draft: ISystemState,
  action: ISystemAction
): ISystemState => {
  switch (action.type) {
    case "set-system": {
      return {
        system: action.payload.system,
      };
    }
    case "system-loading": {
      return {
        system: undefined,
      };
    }
    case "system-not-found": {
      return {
        system: null,
      };
    }
  }
};

/**
 * ----- Provider -----
 */

const SystemProvider = ({ children }: ISystemProvider) => {
  const [state, dispatch] = useImmerReducer(SystemReducer, initialState);

  /**
   * ----- Hook Initialization -----
   */

  const { data, loading } = useSystemQuery();

  /**
   * ----- Use-effects and other logic -----
   */

  React.useEffect(() => {
    if (data?.system && !loading) {
      dispatch({
        type: "set-system",
        payload: {
          system: data.system,
        },
      });
    } else if (!data?.system && loading) {
      dispatch({
        type: "system-loading",
      });
    } else if (!data?.system && !loading) {
      dispatch({
        type: "system-not-found",
      });
    }
  }, [data, loading, dispatch]);

  return (
    <SystemContext.Provider value={{ state }}>
      {children}
    </SystemContext.Provider>
  );
};

const useSystem = () => {
  const context = React.useContext(SystemContext);

  if (context === undefined)
    throw new Error(
      "useSystem can only be used in a component wrapped by SystemProvider"
    );

  return context;
};

export { SystemProvider, useSystem };
