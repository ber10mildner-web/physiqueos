import { getI18n } from "@/lib/i18n/server";
import { getPhotos, getWeights } from "@/lib/data";
import { getToday, requireUser } from "@/lib/auth";
import { Page, PageHeader } from "@/components/ui";
import { PhotoGallery } from "./photo-gallery";

export default async function PhotosPage() {
  const [{ t }, { userId }, photos, weights, today] = await Promise.all([getI18n(), requireUser(), getPhotos(), getWeights(), getToday()]);
  const weightByDate = Object.fromEntries(weights.map((w) => [w.entry_date, w.weight_kg]));
  return (
    <Page>
      <PageHeader title={t.photos.title} subtitle={t.photos.private} back={{ href: "/body", label: t.body.title }} />
      <PhotoGallery userId={userId} photos={photos} weightByDate={weightByDate} today={today} />
    </Page>
  );
}
