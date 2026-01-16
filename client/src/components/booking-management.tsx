import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import {
  Download,
  Filter,
  History,
  RefreshCw,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface Booking {
  id: string;
  salonId: string;
  clientId: string;
  masterId: string;
  serviceId: string;
  date: string;
  time: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  price: number;
  notes?: string;
  modifiedBy?: string;
  modificationHistory?: any[];
  createdAt: string;
  updatedAt: string;
  salonName?: { en: string; ru: string; uz: string };
  masterName?: { en: string; ru: string; uz: string };
  serviceName?: { en: string; ru: string; uz: string };
  clientName?: string;
  clientEmail?: string;
}

interface HistoryEntry {
  timestamp: string;
  action: string;
  changedBy: string;
  changes?: Record<string, any>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-gray-100 text-gray-800",
};

export function BookingManagement() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    status: "",
    salonId: "",
    masterId: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [viewingHistory, setViewingHistory] = useState<Booking | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Build query params
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) queryParams.append(key, value);
  });

  // Fetch bookings
  const { data, isLoading, refetch } = useQuery<{ bookings: Booking[]; total: number }>({
    queryKey: ["/api/owner/bookings/advanced", queryParams.toString()],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/owner/bookings/advanced?${queryParams.toString()}`);
      return res.json();
    },
  });

  const bookings = data?.bookings || [];
  const total = data?.total || 0;

  // Fetch owner salons for filter
  const { data: salons = [] } = useQuery<any[]>({
    queryKey: ["/api/owner/salons"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/owner/salons");
      return res.json();
    },
  });

  // Fetch masters for filter
  const { data: masters = [] } = useQuery<any[]>({
    queryKey: ["/api/owner/masters/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/owner/masters/stats");
      return res.json();
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { bookingIds: string[]; status: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/owner/bookings/bulk-update", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("bookings.bulkUpdateSuccess", "Bookings updated successfully"),
      });
      queryClient.invalidateQueries(["/api/owner/bookings/advanced"]);
      queryClient.invalidateQueries(["/api/owner/dashboard/overview"]);
      setSelectedBookings([]);
      setShowBulkDialog(false);
      setBulkAction("");
      setBulkNotes("");
    },
    onError: (error: any) => {
      toast({
        title: t("bookings.bulkUpdateError", "Failed to update bookings"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get history mutation
  const fetchHistory = async (bookingId: string) => {
    try {
      const res = await apiRequest("GET", `/api/owner/bookings/${bookingId}/history`);
      const response = await res.json();
      setHistory(response.history || []);
    } catch (error) {
      toast({
        title: t("bookings.historyError", "Failed to load history"),
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: "UZS",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const currentLang = i18n.language as "en" | "ru" | "uz";

  // Table columns
  const columns = useMemo<ColumnDef<Booking>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value);
              if (value) {
                setSelectedBookings(bookings.map(b => b.id));
              } else {
                setSelectedBookings([]);
              }
            }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedBookings.includes(row.original.id)}
            onCheckedChange={(value) => {
              if (value) {
                setSelectedBookings([...selectedBookings, row.original.id]);
              } else {
                setSelectedBookings(selectedBookings.filter(id => id !== row.original.id));
              }
            }}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "date",
        header: t("bookings.date", "Date"),
        cell: ({ row }) => {
          const date = new Date(row.original.date);
          return (
            <div>
              <div className="font-medium">{date.toLocaleDateString()}</div>
              <div className="text-sm text-muted-foreground">{row.original.time}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "clientName",
        header: t("bookings.client", "Client"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.clientName || "N/A"}</div>
            <div className="text-sm text-muted-foreground">{row.original.clientEmail}</div>
          </div>
        ),
      },
      {
        accessorKey: "salonName",
        header: t("bookings.salon", "Salon"),
        cell: ({ row }) => row.original.salonName?.[currentLang] || row.original.salonName?.en || "N/A",
      },
      {
        accessorKey: "masterName",
        header: t("bookings.master", "Master"),
        cell: ({ row }) => row.original.masterName?.[currentLang] || row.original.masterName?.en || "N/A",
      },
      {
        accessorKey: "serviceName",
        header: t("bookings.service", "Service"),
        cell: ({ row }) => (
          <div>
            <div>{row.original.serviceName?.[currentLang] || row.original.serviceName?.en || "N/A"}</div>
            <div className="text-sm text-muted-foreground">{row.original.duration} min</div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("bookings.status", "Status"),
        cell: ({ row }) => (
          <Badge className={STATUS_COLORS[row.original.status]}>
            {t(`bookings.status.${row.original.status}`, row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: "price",
        header: t("bookings.price", "Price"),
        cell: ({ row }) => formatCurrency(row.original.price),
      },
      {
        id: "actions",
        header: t("common.actions", "Actions"),
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setViewingHistory(row.original);
              fetchHistory(row.original.id);
            }}
          >
            <History className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [bookings, selectedBookings, currentLang]
  );

  const table = useReactTable({
    data: bookings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const handleBulkUpdate = () => {
    if (!bulkAction || selectedBookings.length === 0) return;

    bulkUpdateMutation.mutate({
      bookingIds: selectedBookings,
      status: bulkAction,
      notes: bulkNotes || undefined,
    });
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.dateFrom) queryParams.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) queryParams.append("dateTo", filters.dateTo);

      const response = await fetch(`/api/owner/bookings/export?${queryParams.toString()}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bookings.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t("bookings.exportSuccess", "Bookings exported successfully"),
      });
    } catch (error) {
      toast({
        title: t("bookings.exportError", "Failed to export bookings"),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("bookings.management", "Booking Management")}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("bookings.total", "Total")}: {total} {t("bookings.bookings", "bookings")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("common.refresh", "Refresh")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                {t("bookings.export", "Export CSV")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4" />
              <h3 className="font-medium">{t("bookings.filters", "Filters")}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <Label className="text-xs">{t("bookings.status", "Status")}</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("common.all", "All")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">{t("common.all", "All")}</SelectItem>
                    <SelectItem value="pending">{t("bookings.status.pending", "Pending")}</SelectItem>
                    <SelectItem value="confirmed">{t("bookings.status.confirmed", "Confirmed")}</SelectItem>
                    <SelectItem value="completed">{t("bookings.status.completed", "Completed")}</SelectItem>
                    <SelectItem value="cancelled">{t("bookings.status.cancelled", "Cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">{t("bookings.salon", "Salon")}</Label>
                <Select
                  value={filters.salonId}
                  onValueChange={(value) => setFilters({ ...filters, salonId: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("common.all", "All")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">{t("common.all", "All")}</SelectItem>
                    {salons.map((salon) => (
                      <SelectItem key={salon.id} value={salon.id}>
                        {salon.name?.[currentLang] || salon.name?.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">{t("bookings.master", "Master")}</Label>
                <Select
                  value={filters.masterId}
                  onValueChange={(value) => setFilters({ ...filters, masterId: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("common.all", "All")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">{t("common.all", "All")}</SelectItem>
                    {masters.map((master) => (
                      <SelectItem key={master.id} value={master.id}>
                        {master.name?.[currentLang] || master.name?.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">{t("bookings.dateFrom", "From")}</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs">{t("bookings.dateTo", "To")}</Label>
                <Input
                  type="date"
                  className="h-9"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs">{t("bookings.search", "Search")}</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-5 w-5 text-muted-foreground" />
                  <Input
                    className="h-9 pl-8"
                    placeholder={t("bookings.searchPlaceholder", "Client name...")}
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedBookings.length > 0 && (
            <Alert className="mb-4">
              <AlertDescription className="flex items-center justify-between">
                <span>
                  {selectedBookings.length} {t("bookings.selected", "selected")}
                </span>
                <Button
                  size="sm"
                  onClick={() => setShowBulkDialog(true)}
                >
                  {t("bookings.bulkUpdate", "Bulk Update Status")}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      {t("bookings.noResults", "No bookings found")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {t("bookings.showing", "Showing")} {table.getRowModel().rows.length} {t("bookings.of", "of")} {total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {t("common.previous", "Previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {t("common.next", "Next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Update Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bookings.bulkUpdate", "Bulk Update Status")}</DialogTitle>
            <DialogDescription>
              {t("bookings.bulkUpdateDescription", "Update status for")} {selectedBookings.length} {t("bookings.bookings", "bookings")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>{t("bookings.newStatus", "New Status")}</Label>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger>
                  <SelectValue placeholder={t("bookings.selectStatus", "Select status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">{t("bookings.status.confirmed", "Confirmed")}</SelectItem>
                  <SelectItem value="in_progress">{t("bookings.status.in_progress", "In Progress")}</SelectItem>
                  <SelectItem value="completed">{t("bookings.status.completed", "Completed")}</SelectItem>
                  <SelectItem value="cancelled">{t("bookings.status.cancelled", "Cancelled")}</SelectItem>
                  <SelectItem value="no_show">{t("bookings.status.no_show", "No Show")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("bookings.notes", "Notes (optional)")}</Label>
              <Textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder={t("bookings.notesPlaceholder", "Add notes...")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={!bulkAction || bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending ? t("common.updating", "Updating...") : t("common.update", "Update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!viewingHistory} onOpenChange={() => setViewingHistory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bookings.modificationHistory", "Modification History")}</DialogTitle>
            <DialogDescription>
              {viewingHistory?.clientName} - {new Date(viewingHistory?.date || "").toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("bookings.noHistory", "No modification history")}
              </p>
            ) : (
              history.map((entry, idx) => (
                <div key={idx} className="border-l-2 border-primary pl-3 pb-3">
                  <div className="text-sm font-medium">{entry.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  {entry.changes && (
                    <pre className="text-xs mt-1 bg-muted p-2 rounded">
                      {JSON.stringify(entry.changes, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingHistory(null)}>
              {t("common.close", "Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
