import { z } from "zod";

/** Price in cents (integer). Server-only; never accept from client for orders. */
export const priceCentsSchema = z.number().int().min(0);

const modifierOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().min(0).optional().default(0),
});

const modifierGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  required: z.boolean(),
  maxSelections: z.number().int().min(0),
  options: z.array(modifierOptionSchema).min(1),
});

export const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  priceCents: priceCentsSchema,
  categoryId: z.string().max(100).optional().default("main"),
  modifierGroups: z.array(modifierGroupSchema).optional(),
});

export const listItemsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/** Partial update (PATCH). All fields optional. */
export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priceCents: priceCentsSchema.optional(),
  categoryId: z.string().max(100).optional(),
  modifierGroups: z.array(modifierGroupSchema).optional(),
});

/** Menu API: category with items (for GET /menu). */
export interface MenuCategoryDTO {
  id: string;
  name: string;
  items: MenuItemDTO[];
}

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

export type CreateItemDTO = z.infer<typeof createItemSchema>;
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
export type UpdateItemDTO = z.infer<typeof updateItemSchema>;
