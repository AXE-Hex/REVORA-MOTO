'use client';

import Image from 'next/image';
import { useState } from 'react';

export type ProductMedia = { id: string; url: string; alt: string };

export function ProductGallery({
  images,
  fallbackAlt,
}: {
  images: ProductMedia[];
  fallbackAlt: string;
}) {
  const [selected, setSelected] = useState(images[0]?.id || '');
  const active = images.find((image) => image.id === selected) || images[0];
  return (
    <div>
      <div className="detail-photo">
        {active ? (
          <Image
            src={active.url}
            alt={active.alt}
            fill
            priority
            sizes="(max-width: 760px) 100vw, 60vw"
          />
        ) : (
          <div className="image-fallback">
            REVORA<span>R/</span>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="toolbar" role="group" aria-label="Product gallery">
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              aria-label={image.alt || fallbackAlt}
              aria-pressed={image.id === active?.id}
              onClick={() => setSelected(image.id)}
              style={{
                padding: 0,
                border:
                  image.id === active?.id
                    ? '2px solid #c9aa67'
                    : '1px solid #666',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <Image
                src={image.url}
                alt=""
                width={72}
                height={72}
                style={{ objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
