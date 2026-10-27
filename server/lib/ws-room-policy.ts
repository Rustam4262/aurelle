export interface RoomAccess {
  isActiveUser(userId: string): Promise<boolean>;
  isSuperAdmin(userId: string): Promise<boolean>;
  ownsSalon(userId: string, salonId: string): Promise<boolean>;
}

export async function mayJoinRoom(
  userId: string,
  room: unknown,
  access: RoomAccess,
): Promise<boolean> {
  if (typeof room !== "string" || room.length > 200) return false;
  if (room !== "admin" && !/^salon_[a-zA-Z0-9-]+$/.test(room)) return false;
  if (!(await access.isActiveUser(userId))) return false;
  // The shared admin stream contains cross-domain data; restricted admin
  // roles must not receive it until per-event permissions are implemented.
  if (room === "admin") return access.isSuperAdmin(userId);
  return access.ownsSalon(userId, room.slice("salon_".length));
}
