import { Controller, Get, Inject } from "@nestjs/common";
import { ItemsService } from "./items.service";

@Controller("api/v1/menu")
export class MenuController {
  constructor(@Inject(ItemsService) private readonly itemsService: ItemsService) {}

  @Get()
  getMenu() {
    return this.itemsService.getMenu();
  }
}
