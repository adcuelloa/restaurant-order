import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import type { ModifierGroup } from "./modifier.schema";
import { ModifierGroupSchema } from "./modifier.schema";

export type ItemDocument = HydratedDocument<Item>;

@Schema({ timestamps: true, _id: true })
export class Item {
  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ default: "", type: String })
  description!: string;

  /** Price in cents (integer). Server-only. */
  @Prop({ required: true, type: Number })
  priceCents!: number;

  @Prop({ default: "main", type: String })
  categoryId!: string;

  @Prop({ type: [ModifierGroupSchema], default: undefined })
  modifierGroups?: ModifierGroup[];
}

export const ItemSchema = SchemaFactory.createForClass(Item);
