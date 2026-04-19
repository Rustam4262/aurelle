import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Master } from "@shared/schema";

interface CreateMasterData {
  name: string;
  specialties: { en: string[]; ru: string[]; uz: string[] };
  experience: number;
  email?: string;
  password?: string;
}

interface OwnerSalonStaffProps {
  salonId: string;
}

export function OwnerSalonStaff({ salonId }: OwnerSalonStaffProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [newMaster, setNewMaster] = useState({
    name: "",
    specialties: "",
    experience: "",
    email: "",
    password: "",
  });

  const { data: masters, isLoading: mastersLoading } = useQuery<Master[]>({
    queryKey: ["/api/owner/salons", salonId, "masters"],
  });

  const createMasterMutation = useMutation({
    mutationFn: async (data: CreateMasterData) => {
      return apiRequest("POST", `/api/owner/salons/${salonId}/masters`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/salons", salonId, "masters"] });
      toast({ title: t("marketplace.owner.masterAdded") });
      setNewMaster({ name: "", specialties: "", experience: "", email: "", password: "" });
    },
    onError: (error: Error) => {
      toast({
        title: t("marketplace.owner.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMasterMutation = useMutation({
    mutationFn: async (masterId: string) => {
      return apiRequest("DELETE", `/api/owner/salons/${salonId}/masters/${masterId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/salons", salonId, "masters"] });
      toast({ title: t("marketplace.owner.masterDeleted") });
    },
    onError: (error: Error) => {
      toast({
        title: t("marketplace.owner.error"),
        description: error.message || t("marketplace.owner.deleteMasterError"),
        variant: "destructive",
      });
    },
  });

  const handleAddMaster = (e: React.FormEvent) => {
    e.preventDefault();
    const masterData: CreateMasterData = {
      name: newMaster.name,
      specialties: {
        en: newMaster.specialties.split(",").map((s) => s.trim()),
        ru: newMaster.specialties.split(",").map((s) => s.trim()),
        uz: newMaster.specialties.split(",").map((s) => s.trim()),
      },
      experience: parseInt(newMaster.experience) || 0,
    };

    if (newMaster.email && newMaster.password) {
      masterData.email = newMaster.email;
      masterData.password = newMaster.password;
    }

    createMasterMutation.mutate(masterData);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-medium text-foreground mb-4">{t("marketplace.owner.addMaster")}</h3>
        <form onSubmit={handleAddMaster} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t("marketplace.owner.masterName")}</Label>
              <Input
                value={newMaster.name}
                onChange={(e) => setNewMaster({ ...newMaster, name: e.target.value })}
                placeholder="John Smith"
                required
                data-testid="input-master-name"
              />
            </div>
            <div>
              <Label>{t("marketplace.owner.specialties")}</Label>
              <Input
                value={newMaster.specialties}
                onChange={(e) => setNewMaster({ ...newMaster, specialties: e.target.value })}
                placeholder="Haircut, Coloring, Styling"
                data-testid="input-master-specialties"
              />
            </div>
            <div>
              <Label>
                {t("marketplace.owner.experience")} ({t("marketplace.owner.years")})
              </Label>
              <Input
                type="number"
                value={newMaster.experience}
                onChange={(e) => setNewMaster({ ...newMaster, experience: e.target.value })}
                placeholder="5"
                data-testid="input-master-experience"
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              {t("marketplace.owner.masterLoginCredentials")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t("marketplace.auth.email")}</Label>
                <Input
                  type="email"
                  value={newMaster.email}
                  onChange={(e) => setNewMaster({ ...newMaster, email: e.target.value })}
                  placeholder="master@example.com"
                  data-testid="input-master-email"
                />
              </div>
              <div>
                <Label>{t("marketplace.auth.password")}</Label>
                <Input
                  type="password"
                  value={newMaster.password}
                  onChange={(e) => setNewMaster({ ...newMaster, password: e.target.value })}
                  placeholder="Min 6 characters"
                  minLength={6}
                  data-testid="input-master-password"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("marketplace.owner.credentialsOptional")}
            </p>
          </div>

          <Button
            type="submit"
            disabled={createMasterMutation.isPending}
            data-testid="button-add-master"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createMasterMutation.isPending
              ? t("marketplace.owner.adding")
              : t("marketplace.owner.addMaster")}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="font-medium text-foreground mb-4">{t("marketplace.owner.staffList")}</h3>
        {mastersLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        ) : masters && masters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {masters.map((master) => (
              <div
                key={master.id}
                className="flex flex-col gap-4 rounded-md bg-muted/50 p-4 sm:flex-row sm:items-center"
                data-testid={`master-item-${master.id}`}
              >
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{master.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {master.experience} {t("marketplace.owner.yearsExp")}
                  </p>
                  {master.email && (
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {master.email} ({t("marketplace.owner.hasLogin")})
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="self-start sm:self-center"
                  onClick={() => deleteMasterMutation.mutate(master.id)}
                  data-testid={`button-delete-master-${master.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">{t("marketplace.owner.noStaff")}</p>
        )}
      </Card>
    </div>
  );
}
