export type ServiceAudience = "women" | "men" | "unisex";
export type CatalogueAudience = "women" | "men" | "all";

export function matchesAudience(service: string | null | undefined, selected: CatalogueAudience) {
  // Unclassified services belong only to the all-audiences catalogue.
  return selected === "all" || service === "unisex" || service === selected;
}

export const categoryGroups: Record<string, string[]> = {
  hair: ["hair", "haircut", "coloring", "styling"],
  nails: ["nails", "manicure", "pedicure"],
  spa: ["spa", "massage"],
  skincare: ["skincare", "facial"],
  barbershop: ["barbershop", "beard", "shaving"],
};

export function matchesCategory(category: string, selected: string) {
  return (categoryGroups[selected] || [selected]).includes(category);
}
