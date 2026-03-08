import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ArrowLeft, Target, Check, Warehouse } from 'lucide-react';
import { useInventoryBuilder } from '../../hooks/useInventoryBuilder';
import { useInventoryMatch } from '../../hooks/useInventoryMatch';
import { usePlatformSettings } from '../../hooks/usePlatformSettings';
import { supabase } from '../../lib/supabase';
import type { PalletType, PalletQuality, PalletSize, InventoryWizardStep } from '../../types/inventory';
import DynamicStep1PalletInfo from './steps/DynamicStep1PalletInfo';
import Step2QuantityCity from './steps/Step2QuantityCity';
import Step3ImagesDescription from './steps/Step3ImagesDescription';
import Step4PreviewPublish from './steps/Step4PreviewPublish';
import AuthSheet from '../account/AuthSheet';
import DepositingScreen from './DepositingScreen';
import DepositResultScreen from './DepositResultScreen';

interface PrefillOpportunity {
  pallet_type?: string;
  size?: string;
  quality?: string;
  quantity?: number;
  city?: string;
  request_id?: string;
}

interface Props {
  onClose: () => void;
  phone?: string;
  onDepositComplete?: () => void;
  onRegisterComplete?: (data: { phone: string; name: string; userType: 'company' | 'individual'; pin: string }) => Promise<void>;
  onLoginComplete?: (phone: string, pin: string) => Promise<void>;
  authError?: string;
  prefillOpportunity?: PrefillOpportunity;
  inventorySource?: 'supplier_added' | 'purchase_transfer';
}

const STEP_LABELS: Record<InventoryWizardStep, string> = {
  1: 'معلومات الطبلية',
  2: 'الكمية والمدينة',
  3: 'الصور والوصف',
  4: 'معاينة ونشر',
};

export default function InventoryBuilder({
  onClose, phone: sessionPhone, onDepositComplete,
  onRegisterComplete, onLoginComplete, authError,
  prefillOpportunity,
  inventorySource = 'supplier_added',
}: Props) {
  const prefill = prefillOpportunity ? {
    palletType: prefillOpportunity.pallet_type as PalletType | undefined,
    size: prefillOpportunity.size as PalletSize | undefined,
    quality: prefillOpportunity.quality as PalletQuality | undefined,
    quantity: prefillOpportunity.quantity,
    city: prefillOpportunity.city,
  } : undefined;

  const { settings } = usePlatformSettings();
  const builder = useInventoryBuilder(sessionPhone, prefill, settings.inventory_submission.fields_config);
  const { supplierStock } = useInventoryMatch(builder.form, builder.phone);

  const [showRegistration, setShowRegistration] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ url: string; preview: string; file?: File; id?: string; uploading?: boolean; error?: string }[]>([]);
  const draftCreatedRef = useRef(false);

  const invSettings = settings.inventory_submission;
  const imgSettings = settings.inventory_images;

  useEffect(() => {
    if (!sessionPhone) return;
    const phone = sessionPhone.startsWith('0') ? sessionPhone : `0${sessionPhone}`;
    supabase
      .from('suppliers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) builder.setSupplierId(data.id);
      });
  }, [sessionPhone]);

  useEffect(() => {
    if (
      builder.wizardStep === 3 &&
      imgSettings.enabled &&
      !builder.batchId &&
      sessionPhone &&
      builder.isStep1Complete &&
      builder.isStep2Complete &&
      !draftCreatedRef.current
    ) {
      draftCreatedRef.current = true;
      createDraftBatch();
    }
  }, [builder.wizardStep, imgSettings.enabled, builder.batchId, sessionPhone, builder.isStep1Complete, builder.isStep2Complete]);

  const handleDeposit = () => {
    if (!builder.phone) {
      setShowRegistration(true);
    } else {
      doDeposit(builder.phone, builder.supplierId);
    }
  };

  const handleAuthDone = async (phone: string) => {
    setShowRegistration(false);
    builder.setPhone(phone);

    const { data: existing } = await supabase
      .from('suppliers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    let supplierId: string | null = existing?.id ?? null;

    if (!supplierId) {
      const { data: newSupplier } = await supabase
        .from('suppliers')
        .insert({ phone, status: 'pending_verification' })
        .select('id')
        .maybeSingle();
      supplierId = newSupplier?.id ?? null;
    } else {
      await supabase
        .from('suppliers')
        .update({ last_active: new Date().toISOString() })
        .eq('id', supplierId);
    }

    builder.setSupplierId(supplierId);
    doDeposit(phone, supplierId);
  };

  const ensureSupplier = async (phone: string): Promise<string | null> => {
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    if (existing?.id) return existing.id;
    const { data: created } = await supabase
      .from('suppliers')
      .insert({ phone, status: 'pending_verification' })
      .select('id')
      .maybeSingle();
    return created?.id ?? null;
  };

  const createDraftBatch = async () => {
    if (!sessionPhone) return;

    let finalSupplierId = builder.supplierId;
    if (!finalSupplierId) {
      finalSupplierId = await ensureSupplier(sessionPhone);
      if (finalSupplierId) builder.setSupplierId(finalSupplierId);
    }

    const { data: batch } = await supabase
      .from('inventory_batches')
      .insert({
        supplier_id: finalSupplierId,
        phone: sessionPhone,
        pallet_type: builder.form.palletType,
        size: builder.form.size,
        quality: builder.form.quality,
        quantity: builder.form.quantity,
        available_quantity: builder.form.quantity,
        quantity_available: builder.form.quantity,
        min_price: builder.form.pricePerPallet || 0,
        price_per_pallet: builder.form.pricePerPallet || 0,
        pallet_condition: builder.form.condition,
        city: builder.form.city,
        activate_immediately: false,
        status: 'draft',
        description: builder.form.description || '',
        approval_status: 'pending',
      })
      .select('id, batch_id')
      .maybeSingle();

    if (batch) {
      builder.setBatchId(batch.id);
      builder.setBatchRef(batch.batch_id);
    }
  };

  const doDeposit = async (phone: string, supplierId: string | null) => {
    builder.setStep('depositing');

    let finalSupplierId = supplierId;
    if (!finalSupplierId) {
      finalSupplierId = await ensureSupplier(phone);
      if (finalSupplierId) builder.setSupplierId(finalSupplierId);
    }

    const approvalMode = invSettings.approval_mode;
    const shouldPublish = builder.form.publishToMarket !== false;
    const batchStatus = shouldPublish && builder.form.activateImmediately
      ? (approvalMode === 'require_approval' ? 'draft' : 'active')
      : 'draft';
    const approvalStatus = shouldPublish && builder.form.activateImmediately && approvalMode === 'require_approval'
      ? 'pending'
      : 'approved';

    let batch: { id: string; batch_id: string } | null = null;

    if (builder.batchId) {
      const { data: updated } = await supabase
        .from('inventory_batches')
        .update({
          quantity: builder.form.quantity,
          available_quantity: builder.form.quantity,
          quantity_available: builder.form.quantity,
          min_price: builder.form.pricePerPallet || 0,
          price_per_pallet: builder.form.pricePerPallet || 0,
          city: builder.form.city,
          activate_immediately: builder.form.activateImmediately,
          status: batchStatus,
          description: builder.form.description || '',
          approval_status: approvalStatus,
          inventory_source: inventorySource,
        })
        .eq('id', builder.batchId)
        .select('id, batch_id')
        .maybeSingle();
      batch = updated;
    } else {
      const { data: inserted } = await supabase
        .from('inventory_batches')
        .insert({
          supplier_id: finalSupplierId,
          phone,
          pallet_type: builder.form.palletType,
          size: builder.form.size,
          quality: builder.form.quality,
          quantity: builder.form.quantity,
          available_quantity: builder.form.quantity,
          quantity_available: builder.form.quantity,
          min_price: builder.form.pricePerPallet || 0,
          price_per_pallet: builder.form.pricePerPallet || 0,
          pallet_condition: builder.form.condition,
          city: builder.form.city,
          activate_immediately: builder.form.activateImmediately,
          status: batchStatus,
          description: builder.form.description || '',
          approval_status: approvalStatus,
          inventory_source: inventorySource,
        })
        .select('id, batch_id')
        .maybeSingle();
      batch = inserted;
    }

    if (!batch) {
      builder.setMatchFound(false);
      builder.setMatchableQty(0);
      builder.setStep('result');
      return;
    }

    builder.setBatchId(batch.id);
    builder.setBatchRef(batch.batch_id);

    const pendingImages = uploadedImages.filter(img => img.file && !img.id);
    for (let i = 0; i < pendingImages.length; i++) {
      const img = pendingImages[i];
      if (!img.file) continue;
      try {
        const safeName = img.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `inventory/${batch.id}/${Date.now()}_${i}_${safeName}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('inventory-images')
          .upload(path, img.file, {
            cacheControl: '3600',
            upsert: true,
            contentType: img.file.type || 'image/jpeg',
          });
        if (uploadErr) {
          console.error('Storage upload failed:', uploadErr.message);
          continue;
        }
        if (!uploadData) continue;
        const { data: urlData } = supabase.storage.from('inventory-images').getPublicUrl(uploadData.path);
        const { error: insertErr } = await supabase.from('inventory_images').insert({
          batch_id: batch.id,
          storage_path: uploadData.path,
          url: urlData.publicUrl,
          is_primary: i === 0 && !uploadedImages.some(im => im.id),
          sort_order: i,
        });
        if (insertErr) {
          console.error('Image record insert failed:', insertErr.message);
        }
      } catch (e) {
        console.error('Image upload exception:', e);
      }
    }

    builder.setMatchFound(false);
    builder.setMatchableQty(0);
    builder.setStep('result');
    onDepositComplete?.();
  };

  const isDemandFulfillment = !!prefillOpportunity?.request_id;

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 px-4 py-3">
      {([1, 2, 3, 4] as InventoryWizardStep[]).map((s) => {
        const isActive = builder.wizardStep === s;
        const isComplete = s < builder.wizardStep;
        return (
          <button
            key={s}
            onClick={() => {
              if (s < builder.wizardStep || builder.canAdvance(builder.wizardStep)) {
                builder.goToStep(s);
              }
            }}
            className="flex items-center gap-1.5"
          >
            <div className={`flex items-center justify-center rounded-full transition-all duration-300 ${
              isComplete
                ? 'w-6 h-6 bg-[#27AE60]'
                : isActive
                ? 'w-7 h-7 bg-[#1a4a5e] shadow-lg shadow-[#1a4a5e]/20'
                : 'w-6 h-6 bg-gray-200'
            }`}>
              {isComplete ? (
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              ) : (
                <span className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>{s}</span>
              )}
            </div>
            {s < 4 && (
              <div className={`w-6 h-0.5 rounded-full transition-colors ${
                isComplete ? 'bg-[#27AE60]' : 'bg-gray-200'
              }`} />
            )}
          </button>
        );
      })}
    </div>
  );

  const renderWizardContent = () => {
    try {
      switch (builder.wizardStep) {
        case 1:
          return (
            <DynamicStep1PalletInfo
              palletType={builder.form.palletType}
              size={builder.form.size}
              quality={builder.form.quality}
              condition={builder.form.condition}
              onSetType={builder.setPalletType}
              onSetSize={builder.setSize}
              onSetQuality={builder.setQuality}
              onSetCondition={builder.setCondition}
            />
          );
        case 2:
          return (
            <Step2QuantityCity
              quantity={builder.form.quantity}
              city={builder.form.city}
              pricePerPallet={builder.form.pricePerPallet}
              minQuantity={invSettings.min_quantity}
              maxQuantity={invSettings.max_quantity}
              onSetQuantity={builder.setQuantity}
              onSetCity={builder.setCity}
              onSetPrice={builder.setPricePerPallet}
            />
          );
        case 3: {
          return (
            <Step3ImagesDescription
              description={builder.form.description}
              onSetDescription={builder.setDescription}
              images={uploadedImages}
              onSetImages={setUploadedImages}
              batchId={builder.batchId ?? undefined}
              imagesEnabled={imgSettings.enabled}
              maxImages={imgSettings.max_images}
              maxSizeMb={imgSettings.max_size_mb}
              allowedFormats={imgSettings.allowed_formats}
            />
          );
        }
        case 4:
          return (
            <Step4PreviewPublish
              form={builder.form}
              images={uploadedImages}
              approvalMode={invSettings.approval_mode}
              publishToMarket={builder.form.publishToMarket !== false}
              onPublishToMarketChange={builder.setPublishToMarket}
            />
          );
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering wizard step:', error);
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-red-600 text-[14px] font-bold mb-2">حدث خطأ</p>
            <p className="text-[12px] text-gray-600">{error instanceof Error ? error.message : 'خطأ غير معروف'}</p>
            <button
              onClick={() => builder.setWizardStep(1)}
              className="mt-4 px-4 py-2 bg-[#1a4a5e] text-white rounded-lg text-[13px]"
            >
              العودة للبداية
            </button>
          </div>
        </div>
      );
    }
  };

  const canGoNext = builder.canAdvance(builder.wizardStep);

  const scrollRef = useRef<HTMLDivElement>(null);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center" style={{ touchAction: 'none' }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative w-full lg:w-[720px] xl:w-[840px] lg:max-h-[90vh] flex flex-col slide-up lg:rounded-3xl"
        style={{
          background: '#dde9f3',
          boxShadow: '0 40px 100px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.15)',
          height: '100dvh',
          maxHeight: '100dvh',
          overflow: 'hidden',
        }}
      >
        <header
          className="flex items-center justify-between px-5 flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0f2535, #1a3d56)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            paddingTop: 'max(14px, env(safe-area-inset-top))',
            paddingBottom: '14px',
          }}
        >
          <button
            onClick={onClose}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
          <div className="text-center flex-1 px-4">
            <h2 className="text-[15px] lg:text-[17px] font-bold text-white leading-tight">
              {builder.step === 'form'
                ? (isDemandFulfillment ? 'تلبية طلب مشتري' : 'إضافة مخزون جديد')
                : builder.step === 'depositing'
                ? 'جاري النشر...'
                : 'تم النشر'
              }
            </h2>
            {builder.step === 'form' && (
              <p className="text-[11px] text-white/50 mt-0.5">
                {STEP_LABELS[builder.wizardStep]}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {builder.step === 'form' && (
              <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2.5 py-1.5">
                <Warehouse className="w-3 h-3 text-white/60" />
                <span className="text-[10px] font-bold text-white/80">
                  {supplierStock > 0 ? `${supplierStock.toLocaleString('ar-SA')} نشط` : '—'}
                </span>
              </div>
            )}
          </div>
        </header>

        {builder.step === 'form' && renderStepIndicator()}

        {builder.step === 'form' && prefillOpportunity && builder.wizardStep === 1 && (
          <div className="mx-4 mb-2">
            <div
              className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: isDemandFulfillment ? 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)' : 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)' }}
            >
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-[11px] text-white/70 mb-0.5">
                  {isDemandFulfillment ? 'طلب مشتري ينتظر التوريد' : 'أنت تُكمل طلب فرصة محددة'}
                </p>
                <p className="text-[13px] font-bold text-white leading-snug">
                  {prefillOpportunity.pallet_type} — {prefillOpportunity.city}
                </p>
              </div>
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          }}
        >
          {builder.step === 'form' && (
            <div className="px-4 pt-2 pb-40">
              <div
                className="transition-all duration-300"
                key={builder.wizardStep}
                style={{ animation: 'fadeSlideUp 0.25s ease-out' }}
              >
                {renderWizardContent()}
              </div>
            </div>
          )}

          {builder.step === 'depositing' && <DepositingScreen form={builder.form} />}

          {builder.step === 'result' && (
            <DepositResultScreen
              batchRef={builder.batchRef}
              matchFound={builder.matchFound}
              matchableQty={builder.matchableQty}
              onNewDeposit={builder.reset}
              onClose={onClose}
              onGoHome={() => {
                if (onDepositComplete) onDepositComplete();
                onClose();
              }}
              publishedToMarket={builder.form.publishToMarket !== false}
            />
          )}
        </div>

        {builder.step === 'form' && (
          <div
            className="flex-shrink-0 border-t border-gray-200"
            style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)' }}
          >
            <div className="px-4 py-4 flex gap-3" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }} dir="rtl">
              {builder.wizardStep > 1 && (
                <button
                  onClick={builder.prevStep}
                  className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-2xl border-2 border-[#1a4a5e] text-[#1a4a5e] font-bold text-[14px] active:scale-[0.98] transition-transform"
                >
                  <ArrowRight className="w-4 h-4" />
                  السابق
                </button>
              )}

              {builder.wizardStep < 4 ? (
                <button
                  onClick={builder.nextStep}
                  disabled={!canGoNext}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl font-bold text-[14px] transition-all ${
                    canGoNext
                      ? 'bg-[#1a4a5e] text-white shadow-lg shadow-[#1a4a5e]/20 active:scale-[0.98]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleDeposit}
                  disabled={!builder.isFormComplete}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[15px] transition-all ${
                    builder.isFormComplete
                      ? 'bg-[#27AE60] text-white shadow-lg shadow-[#27AE60]/20 active:scale-[0.98]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  نشر المخزون
                </button>
              )}
            </div>
          </div>
        )}

        {showRegistration && createPortal(
          <AuthSheet
            title="نشر المخزون في السوق"
            subtitle="سجّل دخولك أو أنشئ حساباً لنشر مخزونك"
            externalError={authError}
            onRegisterComplete={async (data) => {
              if (onRegisterComplete) await onRegisterComplete(data);
              handleAuthDone(data.phone);
            }}
            onLoginComplete={async (phone, pin) => {
              if (onLoginComplete) await onLoginComplete(phone, pin);
              handleAuthDone(phone);
            }}
            onClose={() => setShowRegistration(false)}
          />,
          document.body
        )}
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}
