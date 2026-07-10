// Type contracts for the booking engine's room/resource admin views.
// Live data is loaded from the database at request time; these types describe
// the shape the admin room views render.

export interface RoomType {
  id: string;
  name: string;
  description: string;
  image: string;
  pricePerNight: number;
  totalRooms: number;
  occupied: number;
  amenities: string[];
  status?: string;
}

export type RoomStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "cleaning"
  | "maintenance";

export interface Room {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  status: RoomStatus;
  floor?: number;
  name?: string;
  type?: string;
  active?: boolean;
  attributes?: Record<string, unknown>;
  currentGuest?: string;
  checkOut?: string | null;
}

export const mockRoomTypes: RoomType[] = [];
export const mockRooms: Room[] = [];
