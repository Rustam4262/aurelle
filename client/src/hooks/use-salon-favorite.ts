import { useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FavoriteSalon {
  id: string;
}

export function useSalonFavorite(salonId: string) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery<FavoriteSalon[]>({
    queryKey: ["/api/favorites"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/favorites");
      if (!res.ok) {
        throw new Error("Failed to load favorites");
      }
      return res.json();
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const isFavorite = useMemo(() => {
    if (!favoritesQuery.data) return false;
    return favoritesQuery.data.some((favorite) => favorite.id === salonId);
  }, [favoritesQuery.data, salonId]);

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/favorites/${salonId}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to toggle favorite");
      }
      return res.json() as Promise<{ favorited: boolean }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/favorites"] });
      toast({
        title: result.favorited
          ? t("marketplace.client.favoriteAdded", "Добавлено в избранное")
          : t("marketplace.client.favoriteRemoved", "Удалено из избранного"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error", "Ошибка"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleFavorite = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (toggleMutation.isPending) return;
    toggleMutation.mutate();
  };

  return {
    isFavorite,
    isLoading: favoritesQuery.isLoading,
    isPending: toggleMutation.isPending,
    toggleFavorite,
  };
}
