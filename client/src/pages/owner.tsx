import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Salon } from "@shared/schema";
import {
  ArrowLeft,
  Plus,
  Store,
  Calendar,
  Users,
  Settings,
  Star,
  Scissors,
  LogOut,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

function getLocalizedText(obj: { en?: string; ru?: string; uz?: string } | null | undefined, lang: string): string {
  if (!obj) return "";
  const langKey = lang as keyof typeof obj;
  return obj[langKey] || obj.en || "";
}

function loginWithReplit() {
  window.location.href = "/api/login";
}

export default function OwnerPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showAddSalon, setShowAddSalon] = useState(false);

  const { data: salons, isLoading: salonsLoading } = useQuery<Salon[]>({
    queryKey: ["/api/owner/salons"],
    enabled: !!user,
  });

  const createSalonMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/owner/salons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/salons"] });
      toast({
        title: "Salon Created!",
        description: "Your salon has been registered successfully.",
      });
      setShowAddSalon(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create salon",
        variant: "destructive",
      });
    },
  });

  const [newSalon, setNewSalon] = useState({
    nameEn: "",
    nameRu: "",
    nameUz: "",
    descriptionEn: "",
    cityEn: "",
    addressEn: "",
    phone: "",
  });

  const handleCreateSalon = (e: React.FormEvent) => {
    e.preventDefault();
    createSalonMutation.mutate({
      name: { en: newSalon.nameEn, ru: newSalon.nameRu || newSalon.nameEn, uz: newSalon.nameUz || newSalon.nameEn },
      description: { en: newSalon.descriptionEn, ru: newSalon.descriptionEn, uz: newSalon.descriptionEn },
      city: newSalon.cityEn,
      address: newSalon.addressEn,
      phone: newSalon.phone,
      latitude: "41.311081",
      longitude: "69.240562",
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-owner">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="font-serif text-xl text-foreground ml-4">{t("marketplace.owner.title")}</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 py-16">
          <Card className="p-8 text-center">
            <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl text-foreground mb-2">
              Register Your Salon
            </h2>
            <p className="text-muted-foreground mb-6">
              Sign in to register your salon and start attracting new clients.
            </p>
            <Button onClick={loginWithReplit} className="w-full" data-testid="button-login-owner">
              Sign In to Continue
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-owner-dash">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-serif text-xl text-foreground ml-4">{t("marketplace.owner.title")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout-owner">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <h2 className="font-serif text-2xl text-foreground">{t("marketplace.owner.mySalons")}</h2>
          <Button onClick={() => setShowAddSalon(!showAddSalon)} data-testid="button-add-salon">
            <Plus className="h-4 w-4 mr-2" />
            {t("marketplace.owner.addSalon")}
          </Button>
        </div>

        {showAddSalon && (
          <Card className="p-6 mb-8">
            <h3 className="font-medium text-foreground mb-4">{t("marketplace.owner.addSalon")}</h3>
            <form onSubmit={handleCreateSalon} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Salon Name (English)
                  </label>
                  <Input
                    value={newSalon.nameEn}
                    onChange={(e) => setNewSalon({ ...newSalon, nameEn: e.target.value })}
                    placeholder="My Beauty Salon"
                    required
                    data-testid="input-salon-name-en"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Salon Name (Russian)
                  </label>
                  <Input
                    value={newSalon.nameRu}
                    onChange={(e) => setNewSalon({ ...newSalon, nameRu: e.target.value })}
                    placeholder="Optional"
                    data-testid="input-salon-name-ru"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Salon Name (Uzbek)
                  </label>
                  <Input
                    value={newSalon.nameUz}
                    onChange={(e) => setNewSalon({ ...newSalon, nameUz: e.target.value })}
                    placeholder="Optional"
                    data-testid="input-salon-name-uz"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Description
                </label>
                <Textarea
                  value={newSalon.descriptionEn}
                  onChange={(e) => setNewSalon({ ...newSalon, descriptionEn: e.target.value })}
                  placeholder="Tell clients about your salon..."
                  data-testid="input-salon-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    City
                  </label>
                  <Input
                    value={newSalon.cityEn}
                    onChange={(e) => setNewSalon({ ...newSalon, cityEn: e.target.value })}
                    placeholder="Tashkent"
                    required
                    data-testid="input-salon-city"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Address
                  </label>
                  <Input
                    value={newSalon.addressEn}
                    onChange={(e) => setNewSalon({ ...newSalon, addressEn: e.target.value })}
                    placeholder="123 Main Street"
                    required
                    data-testid="input-salon-address"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Phone
                </label>
                <Input
                  value={newSalon.phone}
                  onChange={(e) => setNewSalon({ ...newSalon, phone: e.target.value })}
                  placeholder="+998 XX XXX XX XX"
                  data-testid="input-salon-phone"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={createSalonMutation.isPending} data-testid="button-create-salon">
                  {createSalonMutation.isPending ? "Creating..." : "Create Salon"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddSalon(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {salonsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : salons && salons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salons.map((salon) => {
              const name = getLocalizedText(salon.name as any, currentLang);
              const city = getLocalizedText(salon.city as any, currentLang);
              
              return (
                <Card key={salon.id} className="p-6 hover-elevate" data-testid={`card-owner-salon-${salon.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-foreground">{name}</h3>
                      <p className="text-muted-foreground text-sm">{city}</p>
                    </div>
                    {salon.averageRating && Number(salon.averageRating) > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span>{Number(salon.averageRating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-3 bg-muted rounded-md">
                      <p className="font-medium text-foreground">{salon.reviewCount || 0}</p>
                      <p className="text-muted-foreground text-xs">Reviews</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-md">
                      <p className="font-medium text-foreground">-</p>
                      <p className="text-muted-foreground text-xs">Bookings</p>
                    </div>
                  </div>

                  <Link href={`/owner/salon/${salon.id}`}>
                    <Button variant="outline" className="w-full" data-testid={`button-manage-salon-${salon.id}`}>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Salon
                    </Button>
                  </Link>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Scissors className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl text-foreground mb-2">
              {t("marketplace.owner.noSalons")}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t("marketplace.owner.registerFirst")}
            </p>
            <Button onClick={() => setShowAddSalon(true)} data-testid="button-add-first-salon">
              <Plus className="h-4 w-4 mr-2" />
              {t("marketplace.owner.addSalon")}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
