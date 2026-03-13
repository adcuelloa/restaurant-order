import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ _id: false })
export class ModifierOption {
  @Prop({ required: true, type: String })
  id!: string;

  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ default: 0, type: Number })
  priceCents!: number;
}

export const ModifierOptionSchema = SchemaFactory.createForClass(ModifierOption);

@Schema({ _id: false })
export class ModifierGroup {
  @Prop({ required: true, type: String })
  id!: string;

  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ required: true, type: Boolean })
  required!: boolean;

  @Prop({ required: true, type: Number })
  maxSelections!: number;

  @Prop({ type: [ModifierOptionSchema], required: true })
  options!: ModifierOption[];
}

export const ModifierGroupSchema = SchemaFactory.createForClass(ModifierGroup);
