import { Card } from "@/components/ui/card";
import { SalonTeamManagement } from "@/components/salon-team-management";
import { ShieldCheck, UserPlus, Users } from "lucide-react";

interface OwnerSalonTeamProps {
  salonId: string;
}

export function OwnerSalonTeam({ salonId }: OwnerSalonTeamProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/70 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Команда и доступы салона</h3>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Здесь владелец управляет менеджерами, распределяет права и держит под контролем,
              кто может работать с бронированиями, услугами, мастерами и календарём.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:w-[520px]">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <Users className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">Единый контур команды</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Все приглашения и рабочие доступы в одном месте.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">Точный контроль прав</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Разделяйте операционные и контентные зоны без лишнего риска.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <UserPlus className="h-4 w-4 text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">Быстрые приглашения</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Подключайте нового менеджера за пару кликов по email.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <SalonTeamManagement salonId={salonId} />
      </Card>
    </div>
  );
}
