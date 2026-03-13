import api from "@/services/api";

export interface Item {
  id: string;
  name: string;
  description: string;
  priceCents: number;
}

export interface ListItemsResponse {
  items: Item[];
  total: number;
}

export async function fetchItems(limit = 20, offset = 0): Promise<ListItemsResponse> {
  const { data } = await api.get<ListItemsResponse>("/items", {
    params: { limit, offset },
  });
  return data;
}
