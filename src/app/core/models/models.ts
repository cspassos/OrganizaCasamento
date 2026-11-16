export interface Wedding {
  temporarySeed?: boolean;
  id: string;
  name: string;
  date: string;
  demo: boolean;
  brideName?: string;
  groomName?: string;
  photo?: string;
  ceremonyTime?: string;
  receptionTime?: string;
  ceremonyType?: string;
  style?: string;
  theme?: string;
  colors?: string;
  colorPalette?: string[];
  ceremonyDescription?: string;
  initialBudget?: number;
  estimatedGuests?: number;
  capacity?: number;
  city?: string;
  state?: string;
  ceremonyVenue?: string;
  ceremonyAddress?: string;
  receptionVenue?: string;
  receptionAddress?: string;
  notes?: string;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export interface WeddingEntity {
  id: string;
  weddingId: string;
}
export interface Preferences {
  id: string;
  dark: boolean;
  collapsed: boolean;
}
export interface Repository<T extends { id: string }> {
  list(): Promise<T[]>;
  save(value: T): Promise<void>;
  remove(id: string): Promise<void>;
}
