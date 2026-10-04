import { useSyncExternalStore } from "react";

export function useMediaQuery(query) {
  const subscribe = (callback) => {
    const mediaQuery = window.matchMedia(query);

    mediaQuery.addEventListener("change", callback);

    return () => {
      mediaQuery.removeEventListener("change", callback);
    };
  };

  const getSnapshot = () => {
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => {
    return false;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
