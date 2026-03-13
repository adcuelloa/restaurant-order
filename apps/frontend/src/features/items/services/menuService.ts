import api from "@/services/api";

export interface ModifierOptionDTO {
  id: string;
  name: string;
  priceCents: number;
}

export interface ModifierGroupDTO {
  id: string;
  name: string;
  required: boolean;
  maxSelections: number;
  options: ModifierOptionDTO[];
}

export interface MenuItemDTO {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  modifierGroups?: ModifierGroupDTO[];
}

export interface MenuCategoryDTO {
  id: string;
  name: string;
  items: MenuItemDTO[];
}

export interface MenuResponse {
  categories: MenuCategoryDTO[];
}

export async function fetchMenu(): Promise<MenuResponse> {
  const { data } = await api.get<MenuResponse>("/menu");
  return data;
}
