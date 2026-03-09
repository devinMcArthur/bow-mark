type StorageType = "session" | "local";

interface IUseStorageReturnValue {
  getItem: (key: string, type?: StorageType) => string;
  setItem: (key: string, value: string, type?: StorageType) => boolean;
  removeItem: (key: string, type?: StorageType) => void;
}

const useStorage = (): IUseStorageReturnValue => {
  const isBrowser: boolean = ((): boolean => typeof window !== "undefined")();
  const storageType = (type?: StorageType): "localStorage" | "sessionStorage" =>
    `${type ?? "session"}Storage`;

  const getItem = (key: string, type: StorageType = "local"): string => {
    return isBrowser ? window[storageType(type)][key] : "";
  };

  const setItem = (
    key: string,
    value: string,
    type: StorageType = "local"
  ): boolean => {
    if (isBrowser) {
      window[storageType(type)].setItem(key, value);
      return true;
    }

    return false;
  };

  const removeItem = (key: string, type: StorageType = "local"): void => {
    window[storageType(type)].removeItem(key);
  };

  return {
    getItem,
    setItem,
    removeItem,
  };
};

export default useStorage;
