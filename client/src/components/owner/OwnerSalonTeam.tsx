import { Card } from "@/components/ui/card";
import { SalonTeamManagement } from "@/components/salon-team-management";

interface OwnerSalonTeamProps {
    salonId: string;
}

export function OwnerSalonTeam({ salonId }: OwnerSalonTeamProps) {
    return (
        <Card className="p-6">
            <SalonTeamManagement salonId={salonId} />
        </Card>
    );
}
