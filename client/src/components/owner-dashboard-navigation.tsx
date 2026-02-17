import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    BarChart3,
    Calendar,
    Scissors,
    Users,
    Store,
    LayoutDashboard,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface OwnerDashboardNavigationProps {
    activeTab: string;
    onTabChange: (value: string) => void;
}

export function OwnerDashboardNavigation({
    activeTab,
    onTabChange,
}: OwnerDashboardNavigationProps) {
    const { t } = useTranslation();

    const navigationItems = [
        {
            value: "dashboard",
            label: t("dashboard.title", "Dashboard"),
            icon: LayoutDashboard,
        },
        {
            value: "bookings",
            label: t("bookings.title", "Bookings"),
            icon: Calendar,
        },
        {
            value: "services",
            label: t("services.title", "Services"),
            icon: Scissors,
        },
        {
            value: "masters",
            label: t("masters.title", "Masters"),
            icon: Users,
        },
        {
            value: "salons",
            label: t("marketplace.owner.mySalons", "My Salons"),
            icon: Store,
        },
        {
            value: "calendar",
            label: t("marketplace.calendar.title", "Calendar"),
            icon: Calendar,
        },
        {
            value: "analytics",
            label: t("marketplace.analytics.title", "Analytics"),
            icon: BarChart3,
        },
    ];

    return (
        <div className="w-full mb-6">
            {/* Mobile View - Select Dropdown */}
            <div className="md:hidden w-full">
                <label className="text-sm font-medium mb-2 block text-muted-foreground">
                    {t("common.navigate", "Navigate to...")}
                </label>
                <Select value={activeTab} onValueChange={onTabChange}>
                    <SelectTrigger className="w-full">
                        <SelectValue>
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const activeItem = navigationItems.find(
                                        (item) => item.value === activeTab,
                                    );
                                    if (activeItem) {
                                        const Icon = activeItem.icon;
                                        return (
                                            <>
                                                <Icon className="h-4 w-4" />
                                                <span>{activeItem.label}</span>
                                            </>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {navigationItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                <div className="flex items-center gap-2">
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Desktop View - TabsList */}
            <div className="hidden md:block">
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/20">
                    {navigationItems.map((item) => (
                        <TabsTrigger
                            key={item.value}
                            value={item.value}
                            className="flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5"
                        >
                            <item.icon className="h-4 w-4 mr-2" />
                            <span>{item.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
        </div>
    );
}
