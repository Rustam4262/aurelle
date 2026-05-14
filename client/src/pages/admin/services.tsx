import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Search, Scissors, Store, UserRound } from "lucide-react";

interface LocalizedText {
  en?: string;
  ru?: string;
  uz?: string;
}

interface AdminService {
  id: string;
  source: "salon" | "solo";
  name: LocalizedText | string;
  nameText?: string;
  category: string;
  priceMin: number;
  priceMax?: number | null;
  duration: number;
  isActive: boolean;
  bookingsCount: number;
  providerType: string;
  providerId: string;
  providerName: LocalizedText | string;
  providerNameText?: string;
  providerStatus?: string | null;
  providerCity?: string | null;
  ownerEmail?: string | null;
  serviceMode?: string | null;
  mobileExtraCharge?: number | null;
}

interface ServicesResponse {
  services: AdminService[];
  categories: string[];
  stats: {
    total: number;
    salonServices: number;
    soloMasterServices: number;
    active: number;
    inactive: number;
    categories: number;
  };
}

type SourceFilter = "all" | "salon" | "solo";

function text(value: LocalizedText | string | undefined | null): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.ru || value.en || value.uz || "";
}

function money(value?: number | null): string {
  if (value === undefined || value === null) return "—";
  return `${Number(value).toLocaleString("ru-RU")} UZS`;
}

function priceRange(service: AdminService): string {
  if (service.priceMax && service.priceMax !== service.priceMin) {
    return `${money(service.priceMin)} - ${money(service.priceMax)}`;
  }
  return money(service.priceMin);
}

function modeLabel(mode?: string | null): string {
  if (mode === "mobile") return "Выезд";
  if (mode === "at_master") return "У мастера";
  if (mode === "both") return "У мастера / выезд";
  return "В салоне";
}

export default function AdminServices() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");

  const { data, isLoading, isError } = useQuery<ServicesResponse>({
    queryKey: ["/api/admin/services", { source }],
  });

  const services = data?.services ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return services;
    return services.filter((service) => {
      const haystack = [
        service.nameText || text(service.name),
        service.category,
        service.providerNameText || text(service.providerName),
        service.providerType,
        service.providerCity,
        service.ownerEmail,
        service.serviceMode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, services]);

  const stats = data?.stats ?? {
    total: 0,
    salonServices: 0,
    soloMasterServices: 0,
    active: 0,
    inactive: 0,
    categories: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Услуги</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Все услуги платформы: салонные позиции владельцев и услуги фриланс-мастеров в одном контрольном списке.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ["all", "Все"],
            ["salon", "Салоны"],
            ["solo", "Фриланс-мастера"],
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={source === value ? "default" : "outline"}
              size="sm"
              onClick={() => setSource(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего услуг</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Салонные</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.salonServices}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Фриланс</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.soloMasterServices}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Активные</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.active}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Категории</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.categories}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по услуге, категории, салону, мастеру или email"
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Загружаем услуги...</div>
          ) : isError ? (
            <div className="py-12 text-center text-destructive">Не удалось загрузить услуги</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Услуги не найдены</div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Услуга</TableHead>
                    <TableHead>Поставщик</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Время</TableHead>
                    <TableHead>Режим</TableHead>
                    <TableHead>Записи</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((service) => {
                    const providerName = service.providerNameText || text(service.providerName);
                    const serviceName = service.nameText || text(service.name);
                    const isSalon = service.source === "salon";

                    return (
                      <TableRow key={`${service.source}-${service.id}`}>
                        <TableCell className="min-w-[240px]">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <Scissors className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="break-words font-medium">{serviceName || "Без названия"}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{service.category}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[220px]">
                          <div className="flex items-start gap-2">
                            {isSalon ? (
                              <Store className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            ) : (
                              <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="min-w-0">
                              <p className="break-words font-medium">{providerName || "Не указан"}</p>
                              <p className="break-words text-sm text-muted-foreground">
                                {service.providerType}
                                {service.ownerEmail ? ` · ${service.ownerEmail}` : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{priceRange(service)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {service.duration} мин
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{modeLabel(service.serviceMode)}</Badge>
                          {service.mobileExtraCharge ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              +{money(service.mobileExtraCharge)}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{service.bookingsCount}</TableCell>
                        <TableCell>
                          {service.isActive ? (
                            <Badge className="bg-green-100 text-green-800">Активна</Badge>
                          ) : (
                            <Badge variant="secondary">Скрыта</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
