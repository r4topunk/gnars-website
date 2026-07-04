import shopData from "@/data/shop.json";
import type { ShopItem } from "@/types/shop";

const items = (shopData.items ?? []) as ShopItem[];

export async function getAllShopItems(): Promise<ShopItem[]> {
  return items;
}

export async function getShopItemsByType(type: ShopItem["type"]): Promise<ShopItem[]> {
  return items.filter((item) => item.type === type);
}

export async function getFeaturedShopItems(): Promise<ShopItem[]> {
  return items.filter((item) => item.featured);
}

export async function getShopItemBySlug(slug: string): Promise<ShopItem | null> {
  return items.find((item) => item.slug === slug) ?? null;
}
