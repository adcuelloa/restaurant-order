import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { ItemDocument } from "./schemas/item.schema";
import { Item } from "./schemas/item.schema";
import type {
  CreateItemDTO,
  ListItemsQuery,
  MenuCategoryDTO,
  MenuItemDTO,
  UpdateItemDTO,
} from "./items.types";

const CATEGORY_NAMES: Record<string, string> = {
  main: "Main",
  sides: "Sides",
  drinks: "Drinks",
};

@Injectable()
export class ItemsService {
  constructor(@InjectModel(Item.name) private readonly itemModel: Model<ItemDocument>) {}

  /** GET /menu: categories with items and modifier groups. */
  async getMenu(): Promise<{ categories: MenuCategoryDTO[] }> {
    const docs = await this.itemModel.find().sort({ categoryId: 1, name: 1 }).lean().exec();
    const byCategory = new Map<string, MenuItemDTO[]>();
    for (const doc of docs) {
      const d = doc as {
        _id: unknown;
        name: string;
        description: string;
        priceCents: number;
        categoryId?: string;
        modifierGroups?: Array<{
          id: string;
          name: string;
          required: boolean;
          maxSelections: number;
          options: Array<{ id: string; name: string; priceCents?: number }>;
        }>;
      };
      const categoryId = d.categoryId ?? "main";
      const item: MenuItemDTO = {
        id: String(d._id),
        name: d.name,
        description: d.description,
        priceCents: d.priceCents,
      };
      if (d.modifierGroups && d.modifierGroups.length > 0) {
        item.modifierGroups = d.modifierGroups.map((g) => ({
          id: g.id,
          name: g.name,
          required: g.required,
          maxSelections: g.maxSelections,
          options: g.options.map((o) => ({
            id: o.id,
            name: o.name,
            priceCents: o.priceCents ?? 0,
          })),
        }));
      }
      const list = byCategory.get(categoryId) ?? [];
      list.push(item);
      byCategory.set(categoryId, list);
    }
    const categories: MenuCategoryDTO[] = [];
    for (const [id, items] of byCategory.entries()) {
      categories.push({
        id,
        name: CATEGORY_NAMES[id] ?? id,
        items,
      });
    }
    return { categories };
  }

  async findAll(query: ListItemsQuery): Promise<{
    items: Array<{ id: string; name: string; description: string; priceCents: number }>;
    total: number;
  }> {
    const { limit, offset } = query;
    const [items, total] = await Promise.all([
      this.itemModel.find().skip(offset).limit(limit).lean().exec(),
      this.itemModel.countDocuments().exec(),
    ]);
    return {
      items: items.map((doc) => ({
        id: String((doc as { _id: unknown })._id),
        name: (doc as { name: string }).name,
        description: (doc as { description: string }).description,
        priceCents: (doc as { priceCents: number }).priceCents,
      })),
      total,
    };
  }

  async create(dto: CreateItemDTO & { description?: string }): Promise<{
    id: string;
    name: string;
    description: string;
    priceCents: number;
  }> {
    const doc = await this.itemModel.create({
      name: dto.name,
      description: dto.description ?? "",
      priceCents: dto.priceCents,
      categoryId: dto.categoryId ?? "main",
      ...(dto.modifierGroups && dto.modifierGroups.length > 0 && { modifierGroups: dto.modifierGroups }),
    });
    return {
      id: String(doc._id),
      name: doc.name,
      description: doc.description,
      priceCents: doc.priceCents,
    };
  }

  async update(
    id: string,
    dto: UpdateItemDTO
  ): Promise<{
    id: string;
    name: string;
    description: string;
    priceCents: number;
  }> {
    const doc = await this.itemModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true, runValidators: true }
    ).exec();
    if (!doc) {
      throw new NotFoundException(`Item not found: ${id}`);
    }
    return {
      id: String(doc._id),
      name: doc.name,
      description: doc.description,
      priceCents: doc.priceCents,
    };
  }
}
