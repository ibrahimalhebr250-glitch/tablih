import { useState, useRef, useCallback, useEffect } from 'react';
import { Minus, Plus, MapPin, DollarSign } from 'lucide-react';
import { QUICK_QUANTITIES, SAUDI_CITIES } from '../../../types/inventory';
import { useInventorySettings } from '../../../hooks/useInventorySettings';

interface Props {
  quantity: number;
  city: string;
  pricePerPallet: number;
  minQuantity?: number;
  maxQuantity?: number;
  onSetQuantity: (v: number) => void;
  onSetCity: (v: string) => void;
  onSetPrice: (v: number) => void;
}

export default function Step2QuantityCity({
  quantity, city, pricePerPallet, minQuantity: propMinQuantity, maxQuantity: propMaxQuantity,
  onSetQuantity, onSetCity, onSetPrice,
}: Props) {
  const { settings, loading } = useInventorySettings();
  const [showAllCities, setShowAllCities] = useState(false);

  const minQuantity = propMinQuantity ?? settings?.min_quantity ?? 100;
  const maxQuantity = propMaxQuantity ?? settings?.max_quantity ?? 10000;
  const quantityStep = settings?.quantity_step ?? 100;
  const minPrice = settings?.min_price ?? 0;
  const maxPrice = settings?.max_price ?? 1000;
  const priceStep = settings?.price_step ?? 5;
  const allowNegotiation = settings?.allow_negotiation ?? true;

  const PRICE_PRESETS = allowNegotiation
    ? [0, 10, 25, 50, 75, 100, 150, 200, 300, 500].filter(p => p >= minPrice && p <= maxPrice)
    : [10, 25, 50, 75, 100, 150, 200, 300, 500].filter(p => p >= minPrice && p <= maxPrice);

  const outOfRange = quantity > 0 && (quantity < minQuantity || quantity > maxQuantity);

  const qtyHoldRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const priceHoldRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qtyValueRef = useRef(quantity);
  const priceValueRef = useRef(pricePerPallet);
  qtyValueRef.current = quantity;
  priceValueRef.current = pricePerPallet;

  const stopQtyHold = useCallback(() => {
    if (qtyHoldRef.current) { clearInterval(qtyHoldRef.current); qtyHoldRef.current = null; }
  }, []);

  const stopPriceHold = useCallback(() => {
    if (priceHoldRef.current) { clearInterval(priceHoldRef.current); priceHoldRef.current = null; }
  }, []);

  useEffect(() => () => { stopQtyHold(); stopPriceHold(); }, [stopQtyHold, stopPriceHold]);

  const startQtyHold = useCallback((delta: number) => {
    stopQtyHold();
    const newQty = Math.max(1, Math.min(maxQuantity, qtyValueRef.current + delta));
    onSetQuantity(Math.floor(newQty / quantityStep) * quantityStep);
    qtyHoldRef.current = setInterval(() => {
      const newQty = Math.max(1, Math.min(maxQuantity, qtyValueRef.current + delta));
      onSetQuantity(Math.floor(newQty / quantityStep) * quantityStep);
    }, 120);
  }, [maxQuantity, quantityStep, onSetQuantity, stopQtyHold]);

  const startPriceHold = useCallback((delta: number) => {
    stopPriceHold();
    const newPrice = Math.max(minPrice, Math.min(maxPrice, priceValueRef.current + delta));
    onSetPrice(Math.floor(newPrice / priceStep) * priceStep);
    priceHoldRef.current = setInterval(() => {
      const newPrice = Math.max(minPrice, Math.min(maxPrice, priceValueRef.current + delta));
      onSetPrice(Math.floor(newPrice / priceStep) * priceStep);
    }, 100);
  }, [minPrice, maxPrice, priceStep, onSetPrice, stopPriceHold]);

  const sliderPercent = ((pricePerPallet - minPrice) / (maxPrice - minPrice)) * 100;

  const popularCities = SAUDI_CITIES.slice(0, 8);
  const displayedCities = showAllCities ? SAUDI_CITIES : popularCities;

  return (
    <div className="space-y-6" dir="rtl">

      {/* --- Quantity Section --- */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-[#1a4a5e] rounded-lg flex items-center justify-center">
            <span className="text-[11px] font-bold text-white">#</span>
          </div>
          <h3 className="text-[14px] font-bold text-[#1a4a5e]">الكمية (طبلية)</h3>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          {outOfRange && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 text-[11px] text-red-600">
              الكمية يجب أن تكون بين {minQuantity.toLocaleString()} و {maxQuantity.toLocaleString()} طبلية
            </div>
          )}

          <div className="flex items-center justify-between gap-4 mb-4">
            <button
              onPointerDown={() => startQtyHold(-100)}
              onPointerUp={stopQtyHold}
              onPointerLeave={stopQtyHold}
              onPointerCancel={stopQtyHold}
              className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform select-none touch-none"
            >
              <Minus className="w-5 h-5 text-[#2c5f7c]" strokeWidth={2.5} />
            </button>
            <div className="flex-1 text-center select-none">
              <div className="text-[36px] font-bold text-[#1a4a5e] leading-none tabular-nums">
                {quantity.toLocaleString('ar-SA')}
              </div>
              <span className="text-[11px] text-[#a0b5c0] mt-1 block">طبلية</span>
            </div>
            <button
              onPointerDown={() => startQtyHold(100)}
              onPointerUp={stopQtyHold}
              onPointerLeave={stopQtyHold}
              onPointerCancel={stopQtyHold}
              className="w-14 h-14 rounded-full bg-[#1a4a5e] flex items-center justify-center active:scale-90 transition-transform shadow-md select-none touch-none"
            >
              <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            {QUICK_QUANTITIES.map((q) => (
              <button
                key={q}
                onClick={() => onSetQuantity(q)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all select-none ${
                  quantity === q
                    ? 'bg-[#1a4a5e] text-white shadow-sm'
                    : 'bg-gray-100 text-[#2c5f7c]'
                }`}
              >
                {q.toLocaleString('ar-SA')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- City Section --- */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-[#1a4a5e]" />
          <h3 className="text-[14px] font-bold text-[#1a4a5e]">المدينة</h3>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-2">
            {displayedCities.map((c) => (
              <button
                key={c}
                onClick={() => onSetCity(c)}
                className={`px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all select-none ${
                  city === c
                    ? 'bg-[#1a4a5e] text-white shadow-sm'
                    : 'bg-gray-100 text-[#2c5f7c] hover:bg-gray-200 active:scale-95'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {!showAllCities && SAUDI_CITIES.length > 8 && (
            <button
              onClick={() => setShowAllCities(true)}
              className="mt-3 w-full py-2 text-[12px] font-bold text-[#1a4a5e] bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors select-none"
            >
              عرض كل المدن ({SAUDI_CITIES.length})
            </button>
          )}
          {showAllCities && (
            <button
              onClick={() => setShowAllCities(false)}
              className="mt-3 w-full py-2 text-[12px] font-bold text-[#a0b5c0] bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors select-none"
            >
              عرض أقل
            </button>
          )}
        </div>
      </div>

      {/* --- Price Section (no keyboard) --- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-[#a0b5c0] bg-gray-100 px-2 py-0.5 rounded-full">اختياري</span>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#1a4a5e]" />
            <h3 className="text-[14px] font-bold text-[#1a4a5e]">السعر لكل طبلية</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="bg-[#F5F9FC] border border-[#d0e5f2] rounded-xl px-3 py-2 mb-4">
            <p className="text-[11px] text-[#4a7a90] leading-relaxed">
              اترك صفر للتفاوض لاحقاً
            </p>
          </div>

          {/* Price display + buttons */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <button
              onPointerDown={() => startPriceHold(-1)}
              onPointerUp={stopPriceHold}
              onPointerLeave={stopPriceHold}
              onPointerCancel={stopPriceHold}
              className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform select-none touch-none"
            >
              <Minus className="w-5 h-5 text-[#2c5f7c]" strokeWidth={2.5} />
            </button>
            <div className="flex-1 text-center select-none">
              <div className="text-[32px] font-bold text-[#1a4a5e] leading-none tabular-nums">
                {pricePerPallet > 0 ? pricePerPallet.toLocaleString('ar-SA') : '٠'}
              </div>
              <span className="text-[11px] text-[#a0b5c0] mt-1 block">ريال / طبلية</span>
            </div>
            <button
              onPointerDown={() => startPriceHold(1)}
              onPointerUp={stopPriceHold}
              onPointerLeave={stopPriceHold}
              onPointerCancel={stopPriceHold}
              className="w-12 h-12 rounded-full bg-[#1a4a5e] flex items-center justify-center active:scale-90 transition-transform shadow-md select-none touch-none"
            >
              <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
            </button>
          </div>

          {/* Slider */}
          <div className="relative mb-4 px-1">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${sliderPercent}%`,
                  background: 'linear-gradient(90deg, #1a4a5e, #2c7a9c)',
                }}
              />
            </div>
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              step={1}
              value={pricePerPallet}
              onChange={(e) => onSetPrice(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
              style={{ WebkitAppearance: 'none', margin: 0 }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-[3px] border-[#1a4a5e] rounded-full shadow-md pointer-events-none transition-all duration-75"
              style={{ left: `calc(${sliderPercent}% - 12px)` }}
            />
          </div>

          {/* Price presets */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {PRICE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => onSetPrice(p)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all select-none ${
                  pricePerPallet === p
                    ? 'bg-[#1a4a5e] text-white shadow-sm'
                    : 'bg-gray-100 text-[#2c5f7c] active:scale-95'
                }`}
              >
                {p === 0 ? 'تفاوض' : p.toLocaleString('ar-SA')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
