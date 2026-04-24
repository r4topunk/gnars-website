import Image from "next/image";

export function NogglesRailsInterludeImage() {
  return (
    <section className="py-2">
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="relative aspect-[16/9] w-full">
          <Image
            src="https://img.paragraph.com/cdn-cgi/image/format=auto,width=750,quality=85/https://storage.googleapis.com/papyrus_images/d0cc673744a2b91f96f0795dbaf9c4d0bd222a788eb6938ac3fe944c3f4b8f13.jpg"
            alt="NogglesRails interlude"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      </div>
    </section>
  );
}
