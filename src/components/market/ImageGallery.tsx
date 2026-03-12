import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, ImageOff, ZoomIn } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  alt?: string;
  aspectRatio?: string;
  showCounter?: boolean;
  className?: string;
}

export function ImageGallery({
  images,
  alt = 'صورة الطبلية',
  aspectRatio = '4/3',
  showCounter = true,
  className = '',
}: ImageGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  const validImages = images.filter(Boolean);
  const hasImages = validImages.length > 0;
  const hasMultiple = validImages.length > 1;

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent(c => (c === 0 ? validImages.length - 1 : c - 1));
  }, [validImages.length]);

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrent(c => (c === validImages.length - 1 ? 0 : c + 1));
  }, [validImages.length]);

  if (!hasImages) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 ${className}`}
        style={{ aspectRatio }}
      >
        <div className="flex flex-col items-center gap-2 opacity-40">
          <ImageOff className="w-8 h-8 text-gray-400" />
          <span className="text-[10px] text-gray-400">لا توجد صورة</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }}>
      {imgError[current] ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <ImageOff className="w-8 h-8 text-gray-300" />
        </div>
      ) : (
        <img
          src={validImages[current]}
          alt={alt}
          className="w-full h-full object-cover transition-opacity duration-300"
          onError={() => setImgError(prev => ({ ...prev, [current]: true }))}
          loading="lazy"
        />
      )}

      {hasMultiple && (
        <>
          <button
            onClick={prev}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>

          {showCounter && (
            <div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            >
              <span className="text-[10px] text-white font-bold">{current + 1}/{validImages.length}</span>
            </div>
          )}

          <div className="absolute bottom-2 right-2 flex gap-1">
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className="rounded-full transition-all"
                style={{
                  width: i === current ? 16 : 5,
                  height: 5,
                  background: i === current ? 'white' : 'rgba(255,255,255,0.5)',
                }}
              />
            ))}
          </div>
        </>
      )}

      {hasMultiple && (
        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-lg"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
        >
          <ZoomIn className="w-2.5 h-2.5 text-white" />
          <span className="text-[9px] text-white font-bold">{validImages.length}</span>
        </div>
      )}
    </div>
  );
}

interface FullscreenGalleryProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function FullscreenGallery({ images, initialIndex = 0, onClose }: FullscreenGalleryProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  const validImages = images.filter(Boolean);

  const prev = () => setCurrent(c => c === 0 ? validImages.length - 1 : c - 1);
  const next = () => setCurrent(c => c === validImages.length - 1 ? 0 : c + 1);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.96)' }}
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <span className="text-white text-[14px] font-bold">
          {current + 1} / {validImages.length}
        </span>
        <div className="w-9" />
      </div>

      <div
        className="flex-1 flex items-center justify-center px-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {imgError[current] ? (
          <div className="flex flex-col items-center gap-3 opacity-40">
            <ImageOff className="w-16 h-16 text-gray-400" />
            <span className="text-gray-400 text-sm">تعذّر تحميل الصورة</span>
          </div>
        ) : (
          <img
            src={validImages[current]}
            alt="صورة مكبّرة"
            className="max-w-full max-h-full object-contain rounded-xl"
            onError={() => setImgError(p => ({ ...p, [current]: true }))}
          />
        )}

        {validImages.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={next}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </>
        )}
      </div>

      <div className="flex gap-2 px-4 py-4 overflow-x-auto shrink-0 justify-center" onClick={(e) => e.stopPropagation()}>
        {validImages.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all"
            style={{
              border: i === current ? '2.5px solid white' : '2px solid rgba(255,255,255,0.2)',
              opacity: i === current ? 1 : 0.55,
            }}
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
