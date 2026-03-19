import installationsData from "@/data/installations.json";
import { Installation } from "@/types/installation";

export async function getAllInstallations(): Promise<Installation[]> {
  return installationsData.installations as Installation[];
}

export async function getInstallationBySlug(slug: string): Promise<Installation | null> {
  const installation = installationsData.installations.find((i) => i.slug === slug);
  return (installation as Installation) || null;
}
