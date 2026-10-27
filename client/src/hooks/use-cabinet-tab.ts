import { useLocation, useSearch } from "wouter";

export function useCabinetTab<T extends string>(initial: T): [T, (tab: T) => void] {
  const [path, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tab = (params.get("tab") || initial) as T;
  return [
    tab,
    (next) => {
      if (next === tab) return;
      const nextParams = new URLSearchParams(window.location.search);
      nextParams.set("tab", next);
      navigate(`${path}?${nextParams.toString()}`);
    },
  ];
}
