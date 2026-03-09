import React from "react";
import useMounted from "../../hooks/useMounted";

interface IInfiniteScroll {
  content: JSX.Element;
  enabled: boolean;
  loading: boolean;
  nextPage: () => void;
}

const InfiniteScroll = ({
  content,
  enabled,
  loading,
  nextPage,
}: IInfiniteScroll) => {
  /**
   * ----- Hook Initialization -----
   */

  const { hasMounted } = useMounted();

  /**
   * ----- Functions -----
   */

  const detectBottom = React.useCallback(
    (callback: () => void) => {
      if (hasMounted) {
        if (
          document.body.getBoundingClientRect().bottom - 1 <=
            window.innerHeight &&
          enabled &&
          !loading
        ) {
          callback();
        }
      }
    },
    [enabled, hasMounted, loading]
  );

  /**
   * ----- Use-effects and other logic -----
   */

  // handle loading on scroll
  React.useEffect(() => {
    if (hasMounted) {
      const handler = () => detectBottom(nextPage);

      window.removeEventListener("scroll", handler);

      window.addEventListener("scroll", handler);
      return () => {
        window.removeEventListener("scroll", handler);
      };
    }
  }, [detectBottom, hasMounted, nextPage]);

  /**
   * ----- Rendering -----
   */

  return content;
};

export default InfiniteScroll;
