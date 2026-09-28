'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { pick } from '@/lib/i18n';
export type GalleryImage = {
  id: string;
  url: string;
  alt_ar: string | null;
  alt_en: string | null;
};
export function ShowroomGallery({
  images,
  name,
  locale,
}: {
  images: GalleryImage[];
  name: string;
  locale: Locale;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const touch = useRef<{ x: number; y: number } | null>(null);
  const ignoreClick = useRef(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const current = images[index];
  const move = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + images.length) % images.length);
      setZoom(false);
    },
    [images.length],
  );
  useEffect(() => {
    if (!open) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    overlayRef.current?.querySelector('button')?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
      if (event.key === 'Tab') {
        const buttons = Array.from(
          overlayRef.current?.querySelectorAll('button') || [],
        );
        if (!buttons.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open, move]);
  if (!images.length)
    return (
      <div className="detail-photo">
        <div className="image-fallback">
          REVORA<span>R/</span>
        </div>
      </div>
    );
  return (
    <div className="showroom-gallery">
      <button
        type="button"
        className="gallery-main"
        onClick={() => setOpen(true)}
        aria-label={pick(locale, 'افتح المعرض', 'Open gallery')}
      >
        <Image
          src={current.url}
          alt={pick(locale, current.alt_ar || name, current.alt_en || name)}
          fill
          priority
          sizes="(max-width: 760px) 100vw, 60vw"
        />
        <span className="gallery-expand">
          <Expand size={17} /> {pick(locale, 'عرض كامل', 'FULLSCREEN')}
        </span>
        <span className="gallery-counter">
          {String(index + 1).padStart(2, '0')} /{' '}
          {String(images.length).padStart(2, '0')}
        </span>
      </button>
      <div
        className="gallery-thumbs"
        aria-label={pick(locale, 'صور الدراجة', 'Motorcycle photos')}
      >
        {images.map((photo, i) => (
          <button
            type="button"
            key={photo.id}
            onClick={() => setIndex(i)}
            className={index === i ? 'selected' : ''}
            aria-label={`${pick(locale, 'الصورة', 'Image')} ${i + 1}`}
            aria-current={index === i}
          >
            <Image
              src={photo.url}
              alt={pick(locale, photo.alt_ar || name, photo.alt_en || name)}
              fill
              sizes="100px"
            />
          </button>
        ))}
      </div>
      {open && (
        <div
          ref={overlayRef}
          className="gallery-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={pick(locale, 'معرض صور الدراجة', 'Motorcycle gallery')}
        >
          <div className="gallery-top">
            <span>
              REVORA MOTO / {name}{' '}
              <small>
                {index + 1} / {images.length}
              </small>
            </span>
            <div>
              <button
                type="button"
                onClick={() => setZoom(!zoom)}
                aria-label={
                  zoom
                    ? pick(locale, 'تصغير الصورة', 'Zoom out')
                    : pick(locale, 'تكبير الصورة', 'Zoom in')
                }
                aria-pressed={zoom}
              >
                {zoom ? <Minus /> : <Plus />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={pick(locale, 'إغلاق', 'Close')}
              >
                <X />
              </button>
            </div>
          </div>
          <button
            type="button"
            className="gallery-nav prev"
            onClick={() => move(-1)}
            aria-label={pick(locale, 'الصورة السابقة', 'Previous image')}
            disabled={images.length < 2}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className={`gallery-full-image ${zoom ? 'zoomed' : ''}`}
            aria-label={
              zoom
                ? pick(locale, 'تصغير الصورة', 'Zoom out')
                : pick(locale, 'تكبير الصورة', 'Zoom in')
            }
            aria-pressed={zoom}
            onClick={(event) => {
              if (ignoreClick.current) {
                ignoreClick.current = false;
                return;
              }
              if (!zoom) {
                const rect = event.currentTarget.getBoundingClientRect();
                setZoomOrigin({
                  x:
                    event.detail === 0
                      ? 50
                      : ((event.clientX - rect.left) / rect.width) * 100,
                  y:
                    event.detail === 0
                      ? 50
                      : ((event.clientY - rect.top) / rect.height) * 100,
                });
              }
              setZoom(!zoom);
            }}
            onTouchStart={(event) => {
              touch.current = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY,
              };
            }}
            onTouchEnd={(event) => {
              if (!touch.current || zoom) return;
              const dx = event.changedTouches[0].clientX - touch.current.x;
              const dy = event.changedTouches[0].clientY - touch.current.y;
              touch.current = null;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                ignoreClick.current = true;
                window.setTimeout(() => {
                  ignoreClick.current = false;
                }, 500);
                move(dx > 0 ? -1 : 1);
              }
            }}
          >
            <Image
              key={current.id}
              src={current.url}
              alt={pick(locale, current.alt_ar || name, current.alt_en || name)}
              fill
              sizes="100vw"
              priority
              style={{ transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` }}
            />
          </button>
          <button
            type="button"
            className="gallery-nav next"
            onClick={() => move(1)}
            aria-label={pick(locale, 'الصورة التالية', 'Next image')}
            disabled={images.length < 2}
          >
            <ChevronRight />
          </button>
          <div className="gallery-overlay-thumbs">
            {images.map((photo, i) => (
              <button
                type="button"
                key={photo.id}
                onClick={() => {
                  setIndex(i);
                  setZoom(false);
                }}
                className={index === i ? 'selected' : ''}
                aria-label={`${pick(locale, 'الصورة', 'Image')} ${i + 1}`}
                aria-current={index === i}
              >
                <Image src={photo.url} alt="" fill sizes="70px" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
