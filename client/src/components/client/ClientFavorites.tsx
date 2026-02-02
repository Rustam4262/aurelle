import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Star, MapPin, Calendar, ExternalLink, Store, User } from "lucide-react";
import { FavoriteCardSkeleton } from "@/components/skeletons";
import type { EnrichedFavorite, EnrichedMasterFavorite } from "./types";

function getLocalizedText(
  obj: { en?: string; ru?: string; uz?: string } | null | undefined,
  lang: string,
): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

interface ClientFavoritesProps {
  favorites: EnrichedFavorite[] | undefined;
  masterFavorites?: EnrichedMasterFavorite[] | undefined;
  isLoading: boolean;
  isMasterFavoritesLoading?: boolean;
}

export function ClientFavorites({
  favorites,
  masterFavorites,
  isLoading,
  isMasterFavoritesLoading,
}: ClientFavoritesProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("salons");

  const removeFavoriteMutation = useMutation({
    mutationFn: async (salonId: string) => {
      return apiRequest("DELETE", `/api/client/favorites/${salonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/favorites"] });
      toast({ title: t("marketplace.client.favoriteRemoved") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const removeMasterFavoriteMutation = useMutation({
    mutationFn: async (masterId: string) => {
      return apiRequest("DELETE", `/api/client/master-favorites/${masterId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/master-favorites"] });
      toast({ title: t("marketplace.client.favoriteRemoved") });
    },
    onError: () => {
      toast({ title: t("marketplace.client.error"), variant: "destructive" });
    },
  });

  const renderSalonFavorites = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <FavoriteCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (!favorites || favorites.length === 0) {
      return (
        <Card className="p-8 text-center">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t("marketplace.client.noFavorites")}</p>
          <Link href="/">
            <Button variant="outline" className="mt-4" data-testid="button-browse-salons">
              {t("marketplace.client.browseSalons")}
            </Button>
          </Link>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {favorites.map((favorite) => {
          const salonName = getLocalizedText(favorite.salon?.name as any, currentLang);
          const salonDescription = getLocalizedText(favorite.salon?.description as any, currentLang);
          const coverImage = favorite.salon?.photos?.[0];

          return (
            <Card
              key={favorite.id}
              className="overflow-hidden group"
              data-testid={`favorite-card-${favorite.id}`}
            >
              <div className="relative h-40 bg-muted">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={salonName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeFavoriteMutation.mutate(favorite.salonId)}
                  disabled={removeFavoriteMutation.isPending}
                  data-testid={`button-remove-favorite-${favorite.id}`}
                >
                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                </Button>
                {favorite.salon?.averageRating && Number(favorite.salon.averageRating) > 0 && (
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-sm flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {Number(favorite.salon.averageRating).toFixed(1)}
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-medium text-foreground truncate mb-1">{salonName}</h3>
                {favorite.salon && (
                  <>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{favorite.salon.address}</span>
                    </div>
                    {salonDescription && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {salonDescription}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Link href={`/salon/${favorite.salonId}`} className="flex-1">
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          data-testid={`button-book-favorite-${favorite.id}`}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          {t("marketplace.salon.bookNow")}
                        </Button>
                      </Link>
                      <Link href={`/salon/${favorite.salonId}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-view-favorite-${favorite.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderMasterFavorites = () => {
    if (isMasterFavoritesLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <FavoriteCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (!masterFavorites || masterFavorites.length === 0) {
      return (
        <Card className="p-8 text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t("marketplace.client.noMasterFavorites")}</p>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              {t("marketplace.client.browseMasters")}
            </Button>
          </Link>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {masterFavorites.map((favorite) => {
          const salonName = getLocalizedText(favorite.salon?.name as any, currentLang);

          return (
            <Card
              key={favorite.id}
              className="p-4 group"
              data-testid={`master-favorite-card-${favorite.id}`}
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={favorite.master?.photo || undefined} />
                  <AvatarFallback className="text-lg">
                    {favorite.master?.name?.[0] || "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-foreground truncate">
                        {favorite.master?.name}
                      </h3>
                      {favorite.master?.specialties && (
                        <p className="text-sm text-muted-foreground truncate">
                          {getLocalizedText(favorite.master.specialties as any, currentLang)?.split(",")[0]}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMasterFavoriteMutation.mutate(favorite.masterId)}
                      disabled={removeMasterFavoriteMutation.isPending}
                    >
                      <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                    </Button>
                  </div>

                  {favorite.salon && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                      <Store className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{salonName}</span>
                    </div>
                  )}

                  {favorite.master?.averageRating && Number(favorite.master.averageRating) > 0 && (
                    <div className="flex items-center gap-1 text-sm mt-2">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{Number(favorite.master.averageRating).toFixed(1)}</span>
                      {favorite.master.reviewCount && favorite.master.reviewCount > 0 && (
                        <span className="text-muted-foreground">
                          ({favorite.master.reviewCount})
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {favorite.salon ? (
                      <Link href={`/salon/${favorite.salon.id}`} className="flex-1">
                        <Button variant="default" size="sm" className="w-full">
                          <Calendar className="h-4 w-4 mr-2" />
                          {t("marketplace.salon.bookNow")}
                        </Button>
                      </Link>
                    ) : favorite.master?.isSoloMaster ? (
                      <Link href={`/master/${favorite.masterId}`} className="flex-1">
                        <Button variant="default" size="sm" className="w-full">
                          <Calendar className="h-4 w-4 mr-2" />
                          {t("marketplace.salon.bookNow")}
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const salonCount = favorites?.length || 0;
  const masterCount = masterFavorites?.length || 0;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="salons" className="flex items-center gap-2">
          <Store className="h-4 w-4" />
          {t("marketplace.client.favorites.salons")}
          {salonCount > 0 && (
            <span className="ml-1 text-xs bg-primary/10 px-2 py-0.5 rounded-full">
              {salonCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="masters" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          {t("marketplace.client.favorites.masters")}
          {masterCount > 0 && (
            <span className="ml-1 text-xs bg-primary/10 px-2 py-0.5 rounded-full">
              {masterCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="salons">{renderSalonFavorites()}</TabsContent>
      <TabsContent value="masters">{renderMasterFavorites()}</TabsContent>
    </Tabs>
  );
}
