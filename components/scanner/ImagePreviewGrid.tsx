import Image from 'next/image';

interface ImagePreviewGridProps {
  imagePreviews: string[];
}

export default function ImagePreviewGrid({ imagePreviews }: ImagePreviewGridProps) {
  if (imagePreviews.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-semibold text-lg text-gray-800 mb-3">Seçilen Sayfalar ({imagePreviews.length})</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {imagePreviews.map((src, index) => (
          <div key={index} className="relative aspect-[3/4] rounded-md overflow-hidden border">
            <Image
              src={src}
              alt={`Yüklenen sayfa ${index + 1}`}
              layout="fill"
              objectFit="cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}