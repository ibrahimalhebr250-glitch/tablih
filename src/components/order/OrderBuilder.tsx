import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, RefreshCw, ShoppingBag } from 'lucide-react';
import { useOrderBuilder } from '../../hooks/useOrderBuilder';
import { useMatching } from '../../hooks/useMatching';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { useDynamicOrderBuilder } from '../../hooks/useDynamicOrderBuilder';
import TypeSelector from './TypeSelector';
import SizeSelector from './SizeSelector';
import QualitySelector from './QualitySelector';
import QuantityInput from './QuantityInput';
import CitySelector from './CitySelector';
import FlexibilityToggle from './FlexibilityToggle';
import OrderSummaryBar from './OrderSummaryBar';
import AuthSheet from '../account/AuthSheet';
import MatchingScreen from './MatchingScreen';
import MatchResultScreen from './MatchResultScreen';

interface PrefillOpportunity {
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  available_quantity: number;
  city: string;
}

interface Props {
  onClose: () => void;
  phone?: string;
  onRegisterComplete?: (data: { phone: string; name: string; userType: 'company' | 'individual'; pin: string }) => Promise<void>;
  onLoginComplete?: (phone: string, pin: string) => Promise<void>;
  authError?: string;
  onOpenDeals?: () => void;
  prefillOpportunity?: PrefillOpportunity;
}

const REQUEST_TYPE_CONFIG = {
  standard: { label: 'طلب عادي', icon: ShoppingBag, color: '#1565C0', bg: '#E3F2FD', border: '#BBDEFB' },
  urgent:   { label: 'طلب عاجل', icon: Zap,        color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
  recurring:{ label: 'توريد دوري', icon: RefreshCw, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
};

export default function OrderBuilder({ onClose, phone: prefilledPhone, onRegisterComplete, onLoginComplete, authError, onOpenDeals, prefillOpportunity }: Props) {
  const { settings } = usePlatformSettings();
  const dynamicData = useDynamicOrderBuilder();
  const builder = useOrderBuilder(prefilledPhone, prefillOpportunity ? {
    palletType: prefillOpportunity.pallet_type,
    size: prefillOpportunity.size,
    quality: prefillOpportunity.quality,
    quantity: prefillOpportunity.available_quantity,
    city: prefillOpportunity.city,
  } : undefined, settings.request_creation.fields_config);
  const matching = useMatching();
  const [requestType, setRequestType] = useState<'standard' | 'urgent' | 'recurring'>('standard');
  const [flexibilitySelections, setFlexibilitySelections] = useState<Record<string, boolean>>({});

  const rc = settings.request_creation;
  const allowedTypes = rc.allowed_types;

  const availableSizes = useMemo(() => {
    if (!builder.form.palletType) return dynamicData.palletSizes;
    return dynamicData.getSizesForPalletType(builder.form.palletType);
  }, [builder.form.palletType, dynamicData]);

  const handleFlexibilityChange = (code: string, value: boolean) => {
    setFlexibilitySelections(prev => ({ ...prev, [code]: value }));
  };

  if (dynamicData.loading) {
    return createPortal(
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>,
      document.body
    );
  }

  const stepTitles: Record<string, { title: string; sub?: string }> = {
    form: { title: 'إنشاء طلب جديد', sub: 'حدّد مواصفات طلبك وسيتم مطابقته فورًا مع الشبكة' },
    matching: { title: 'المطابقة الذكية' },
    result: { title: 'نتيجة المطابقة' },
  };

  const currentTitle = stepTitles[builder.step] ?? stepTitles.form;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center" style={{ touchAction: 'none' }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

      <div
        className="relative w-full lg:w-[720px] xl:w-[820px] lg:max-h-[88vh] flex flex-col slide-up lg:rounded-3xl"
        style={{
          background: '#dde9f3',
          boxShadow: '0 40px 100px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.15)',
          height: '100dvh',
          maxHeight: '100dvh',
          overflow: 'hidden',
        }}
      >
        <header
          className="flex items-center justify-between px-6 flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0f2535, #1a3d56)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            paddingTop: 'max(16px, env(safe-area-inset-top))',
            paddingBottom: '16px',
          }}
        >
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="text-center flex-1 px-4">
            <h2 className="text-[15px] lg:text-[17px] font-bold text-white leading-tight">
              {currentTitle.title}
            </h2>
            {currentTitle.sub && (
              <p className="text-[11px] text-white/50 mt-0.5 leading-snug">
                {currentTitle.sub}
              </p>
            )}
          </div>
          <div className="w-9" />
        </header>

        <div
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#b8d0e0 transparent',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
        >
          {builder.step === 'form' && (
            <div className="px-5 pt-5 pb-52 space-y-6 lg:grid lg:grid-cols-2 lg:gap-5 lg:pb-48 lg:pt-6 lg:px-7 lg:space-y-0">
              {allowedTypes.length > 1 && (
                <div className="lg:col-span-2">
                  <h3 className="text-[13px] font-bold text-[#1a4a5e] mb-3 uppercase tracking-wide">نوع الطلب</h3>
                  <div className="flex gap-2">
                    {allowedTypes.map(type => {
                      const cfg = REQUEST_TYPE_CONFIG[type];
                      const Icon = cfg.icon;
                      const sel = requestType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => setRequestType(type)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 transition-all text-[12px] font-semibold"
                          style={{
                            borderColor: sel ? cfg.color : '#e5e7eb',
                            background: sel ? cfg.bg : 'white',
                            color: sel ? cfg.color : '#6b7280',
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {(rc.fields_config.pallet_type?.show ?? true) && (
                <TypeSelector
                  palletTypes={dynamicData.palletTypes}
                  selected={builder.form.palletType}
                  onSelect={builder.setPalletType}
                />
              )}
              {(rc.fields_config.size?.show ?? true) && (
                <SizeSelector
                  palletSizes={availableSizes}
                  selected={builder.form.size}
                  onSelect={builder.setSize}
                />
              )}
              {(rc.fields_config.quality?.show ?? true) && (
                <QualitySelector
                  qualityGrades={dynamicData.qualityGrades}
                  selected={builder.form.quality}
                  onSelect={builder.setQuality}
                />
              )}
              {(rc.fields_config.quantity?.show ?? true) && (
                <QuantityInput
                  value={builder.form.quantity}
                  onChange={builder.setQuantity}
                  settings={dynamicData.quantitySettings}
                />
              )}
              {(rc.fields_config.city?.show ?? true) && (
                <CitySelector
                  cities={dynamicData.cities}
                  selected={builder.form.city}
                  onSelect={builder.setCity}
                />
              )}
              <FlexibilityToggle
                flexibilityOptions={dynamicData.flexibilityOptions}
                selectedOptions={flexibilitySelections}
                onChange={handleFlexibilityChange}
              />
            </div>
          )}

          {builder.step === 'matching' && (
            <MatchingScreen
              form={builder.form}
              phone={builder.phone}
              onDone={builder.handleMatchingDone}
              runMatching={matching.runMatching}
              matchResult={matching.matchResult}
            />
          )}

          {builder.step === 'result' && matching.matchResult && (
            <MatchResultScreen
              form={builder.form}
              requestId={builder.savedRequestId}
              matchResult={matching.matchResult}
              onReset={() => {
                builder.reset();
                onClose();
              }}
              onEdit={() => builder.setStep('form')}
              onExecute={() => {
                builder.reset();
                onClose();
                onOpenDeals?.();
              }}
            />
          )}
        </div>

        {builder.step === 'form' && (
          <OrderSummaryBar
            form={builder.form}
            isComplete={builder.isFormComplete}
            onSubmit={builder.handleCompleteOrder}
          />
        )}

        {builder.step === 'auth' && createPortal(
          <AuthSheet
            title="حفظ طلبك في الشبكة"
            subtitle="سجّل دخولك أو أنشئ حساباً لتأكيد الطلب"
            externalError={authError}
            onRegisterComplete={async (data) => {
              if (onRegisterComplete) await onRegisterComplete(data);
              builder.handleAuthComplete(data.phone);
            }}
            onLoginComplete={async (phone, pin) => {
              if (onLoginComplete) await onLoginComplete(phone, pin);
              builder.handleAuthComplete(phone);
            }}
            onClose={() => builder.setStep('form')}
          />,
          document.body
        )}

        {matching.error && (
          <div className="absolute bottom-24 left-4 right-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 z-50">
            <p className="text-[12px] text-red-600 text-right">{matching.error}</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
