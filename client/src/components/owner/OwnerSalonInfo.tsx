import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Camera, MapPin, Star, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { MultiImageUpload } from "@/components/image-upload";
import { LocationPicker } from "@/components/location-picker";
import { SalonStatusManager } from "@/components/salon-status-manager";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Salon } from "@shared/schema";

interface OwnerSalonInfoProps {
    salon: Salon;
}

function getLocalizedText(
    obj: { en: string; ru: string; uz: string } | null | undefined,
    lang: string,
): string {
    if (!obj) return "";
    const langKey = lang as keyof typeof obj;
    return obj[langKey] || obj.en || "";
}

export function OwnerSalonInfo({ salon }: OwnerSalonInfoProps) {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;
    const { toast } = useToast();
    const salonId = salon.id;

    const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
    const [salonPhotos, setSalonPhotos] = useState<string[]>([]);
    const [locationDialogOpen, setLocationDialogOpen] = useState(false);
    const [salonLocation, setSalonLocation] = useState({
        latitude: Number(salon.latitude) || 41.311081,
        longitude: Number(salon.longitude) || 69.240562,
        address: salon.address || "",
    });

    useEffect(() => {
        if (salon) {
            setSalonLocation({
                latitude: Number(salon.latitude),
                longitude: Number(salon.longitude),
                address: salon.address,
            });
        }
    }, [salon]);

    useEffect(() => {
        if (salon?.photos && photoDialogOpen) {
            setSalonPhotos(salon.photos as string[]);
        }
    }, [salon, photoDialogOpen]);

    const updatePhotosMutation = useMutation({
        mutationFn: async (photos: string[]) => {
            return apiRequest("PATCH", `/api/owner/salons/${salonId}`, { photos });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/owner/salons", salonId] });
            setPhotoDialogOpen(false);
            toast({ title: t("marketplace.owner.photosUpdated") });
        },
        onError: (error: any) => {
            toast({
                title: t("marketplace.owner.error"),
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const updateLocationMutation = useMutation({
        mutationFn: async (location: { latitude: number; longitude: number; address: string }) => {
            return apiRequest("PATCH", `/api/owner/salons/${salonId}`, {
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                address: location.address,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/owner/salons", salonId] });
            setLocationDialogOpen(false);
            toast({ title: t("marketplace.owner.locationUpdated") });
        },
        onError: (error: any) => {
            toast({
                title: t("marketplace.owner.error"),
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSavePhotos = () => {
        updatePhotosMutation.mutate(salonPhotos);
    };

    const handleSaveLocation = () => {
        updateLocationMutation.mutate(salonLocation);
    };

    return (
        <div className="space-y-6">
            <SalonStatusManager salon={salon} />

            <Card className="p-6">
                <h3 className="font-medium text-foreground mb-4">
                    {t("marketplace.owner.salonInfo")}
                </h3>
                <div className="space-y-4">
                    <div>
                        <Label>{t("marketplace.owner.photos")}</Label>
                        <div className="mt-2 grid grid-cols-4 gap-4">
                            {salon.photos && salon.photos.length > 0 ? (
                                (salon.photos as string[]).map((photo, idx) => (
                                    <div key={idx} className="aspect-square bg-muted rounded-md overflow-hidden">
                                        <img src={photo} alt="" className="w-full h-full object-cover" />
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-4 text-center py-8 border-2 border-dashed border-border rounded-md">
                                    <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-muted-foreground text-sm">
                                        {t("marketplace.owner.noPhotos")}
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="mt-2"
                                        size="sm"
                                        onClick={() => setPhotoDialogOpen(true)}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t("marketplace.owner.addPhoto")}
                                    </Button>
                                </div>
                            )}
                            {salon.photos && (salon.photos as string[]).length > 0 && (
                                <div className="col-span-4 mt-2">
                                    <Button variant="outline" size="sm" onClick={() => setPhotoDialogOpen(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t("marketplace.owner.managePhotos")}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>{t("marketplace.owner.address")}</Label>
                            <p className="text-foreground mt-1">{salon.address}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => setLocationDialogOpen(true)}
                            >
                                <MapPin className="h-4 w-4 mr-2" />
                                {t("marketplace.owner.editLocation")}
                            </Button>
                        </div>
                        <div>
                            <Label>{t("marketplace.owner.phone")}</Label>
                            <p className="text-foreground mt-1">{salon.phone}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <Star className="h-5 w-5 fill-primary text-primary" />
                            <span className="font-medium">
                                {Number(salon.averageRating || 0).toFixed(1)}
                            </span>
                        </div>
                        <span className="text-muted-foreground">
                            {salon.reviewCount || 0} {t("marketplace.owner.reviews")}
                        </span>
                    </div>
                </div>
            </Card>

            {/* Dialogs */}
            <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t("marketplace.owner.managePhotos")}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <MultiImageUpload
                            values={salonPhotos}
                            onChange={setSalonPhotos}
                            maxImages={10}
                            uploadType="salons"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPhotoDialogOpen(false)}>
                            {t("marketplace.owner.close")}
                        </Button>
                        <Button onClick={handleSavePhotos} disabled={updatePhotosMutation.isPending}>
                            {t("marketplace.owner.savePhotos")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{t("marketplace.owner.editLocation")}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <LocationPicker
                            latitude={salonLocation.latitude}
                            longitude={salonLocation.longitude}
                            address={salonLocation.address}
                            onLocationChange={setSalonLocation}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>
                            {t("marketplace.owner.close")}
                        </Button>
                        <Button onClick={handleSaveLocation} disabled={updateLocationMutation.isPending}>
                            {updateLocationMutation.isPending
                                ? t("marketplace.owner.saving")
                                : t("marketplace.owner.saveLocation")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
