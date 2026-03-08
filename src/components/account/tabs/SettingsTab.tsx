import { useState } from 'react';
import {
  User,
  Phone,
  Building2,
  Bell,
  Shield,
  LogOut,
  MessageCircle,
  Banknote,
  Lightbulb,
  Trash2,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Pencil,
  Loader2,
  AlertTriangle,
  Headphones,
  ExternalLink,
  Calendar,
  Hash,
  MapPin,
  MessageSquare,
  Send,
} from 'lucide-react';
import type { AppSession } from '../../../types/session';
import { useSettings } from '../../../hooks/useSettings';
import SupportChat from '../settings/SupportChat';

interface Props {
  session: AppSession;
  onLogout: () => void;
  onUpdateProfile?: (updates: { display_name?: string }) => Promise<void>;
  onEditProfile?: () => void;
}

const SECTION_IDS = [
  'account', 'contact', 'notifications', 'support', 'commission', 'suggestions', 'security', 'delete'
] as const;

type SectionId = typeof SECTION_IDS[number];

const ADMIN_WHATSAPP = '966500000000';

function buildAdminWhatsAppLink() {
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent('مرحباً، أتواصل معكم من منصة شبكة الطبليات الوطنية')}`;
}

function SectionHeader({
  title, subtitle, icon, iconBg, open, onToggle,
}: {
  title: string; subtitle: string;
  icon: React.ReactNode; iconBg: string;
  open: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-gray-50/50"
      dir="rtl"
    >
      {open
        ? <ChevronUp className="w-4 h-4 text-[#9ab0bf] flex-shrink-0" />
        : <ChevronDown className="w-4 h-4 text-[#9ab0bf] flex-shrink-0" />
      }
      <div className="flex-1 text-right min-w-0">
        <p className="text-[13px] font-bold text-[#1a3a4a]">{title}</p>
        <p className="text-[11px] text-[#7a9aab] mt-0.5 truncate">{subtitle}</p>
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        {icon}
      </div>
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
      style={{ background: checked ? '#0369A1' : '#d1d5db' }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
        style={{ right: checked ? 'auto' : '2px', left: checked ? '2px' : 'auto' }}
      />
    </button>
  );
}

function SectionCard({
  id, openSection, onToggle, title, subtitle, icon, iconColor, iconBg, children,
}: {
  id: SectionId; openSection: SectionId | null; onToggle: (id: SectionId) => void;
  title: string; subtitle: string;
  icon: React.ReactNode; iconColor: string; iconBg: string;
  children: React.ReactNode;
}) {
  const open = openSection === id;
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
        border: open ? `1.5px solid ${iconColor}30` : '1px solid rgba(0,0,0,0.04)',
      }}
    >
      <SectionHeader
        title={title} subtitle={subtitle} icon={icon} iconBg={iconBg}
        open={open} onToggle={() => onToggle(id)}
      />
      {open && <div className="border-t border-[#f0f6fa]">{children}</div>}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-[#f8fbfd] rounded-xl px-3 py-2.5">
      <span className="text-[12px] font-bold text-[#1a3a4a]">{value}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[#7a9aab]">{label}</span>
        {icon}
      </div>
    </div>
  );
}

function NotifRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Toggle checked={checked} onChange={onChange} />
      <div className="flex-1 text-right">
        <p className="text-[12px] font-bold text-[#1a3a4a]">{label}</p>
        <p className="text-[10px] text-[#7a9aab] mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function CommissionRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-[#f8fbfd] rounded-xl px-3 py-2.5">
      <span className={`text-[12px] font-bold text-[#1a3a4a] ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : 'rtl'}>{value}</span>
      <span className="text-[11px] text-[#7a9aab] flex-shrink-0">{label}</span>
    </div>
  );
}

export default function SettingsTab({ session, onLogout, onUpdateProfile, onEditProfile }: Props) {
  const phone = session.profile.phone;
  const {
    supportMessages, notifPrefs, loadingMessages, sendingMessage, sendingSuggestion, savingProfile,
    sendSupportMessage, submitSuggestion, updateNotifPrefs, updateDisplayName, updateWhatsApp, uploadSupportImage,
  } = useSettings(phone);

  const [openSection, setOpenSection] = useState<SectionId | null>('account');
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ibanCopied, setIbanCopied] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(session.profile.display_name);
  const [nameSaved, setNameSaved] = useState(false);

  const [whatsappEdit, setWhatsappEdit] = useState(false);
  const [whatsappVal, setWhatsappVal] = useState('');
  const [whatsappSaved, setWhatsappSaved] = useState(false);

  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const toggleSection = (id: SectionId) => {
    setOpenSection(prev => prev === id ? null : id);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    await updateDisplayName(newName);
    if (onUpdateProfile) await onUpdateProfile({ display_name: newName.trim() });
    setNameSaved(true);
    setTimeout(() => { setNameSaved(false); setEditingName(false); }, 900);
  };

  const handleSaveWhatsApp = async () => {
    await updateWhatsApp(whatsappVal);
    setWhatsappSaved(true);
    setTimeout(() => { setWhatsappSaved(false); setWhatsappEdit(false); }, 900);
  };

  const handleCopyIBAN = () => {
    navigator.clipboard.writeText('SA1020000001234567890123');
    setIbanCopied(true);
    setTimeout(() => setIbanCopied(false), 2000);
  };

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim()) return;
    setSuggestionError(null);
    const result = await submitSuggestion(
      suggestionText,
      session.profile.display_name || session.profile.company_name || phone
    );
    if (result.success) {
      setSuggestionSent(true);
      setSuggestionText('');
      setTimeout(() => setSuggestionSent(false), 3000);
    } else {
      setSuggestionError(result.error ?? 'حدث خطأ');
    }
  };

  const roles = session.roles;
  const roleLabel = roles.includes('supplier') && roles.includes('buyer') ? 'مورد ومشتري'
    : roles.includes('supplier') ? 'مورد'
    : roles.includes('buyer') ? 'مشتري'
    : 'مستخدم';

  const unreadCount = supportMessages.filter(m => m.sender === 'admin' && !m.is_read).length;

  return (
    <div className="space-y-3" dir="rtl">
      {showSupportChat && (
        <SupportChat
          phone={phone}
          displayName={session.profile.display_name || session.profile.company_name || phone}
          messages={supportMessages}
          loading={loadingMessages}
          sending={sendingMessage}
          onSend={sendSupportMessage}
          onUploadImage={uploadSupportImage}
          onClose={() => setShowSupportChat(false)}
        />
      )}

      {/* 1 — Account Info */}
      <SectionCard
        id="account" openSection={openSection} onToggle={toggleSection}
        title="معلومات الحساب"
        subtitle={session.profile.display_name || session.profile.company_name || phone}
        iconColor="#1a4a5e" iconBg="#E0F2FE"
        icon={<User className="w-5 h-5 text-[#1a4a5e]" />}
      >
        <div className="space-y-2.5 p-4 pt-3">
          {onEditProfile && (
            <button
              onClick={onEditProfile}
              className="w-full flex items-center justify-between gap-3 py-3 px-4 rounded-2xl text-white active:scale-[0.97] transition-transform mb-1"
              style={{ background: 'linear-gradient(135deg, #0369A1, #0284C7)', boxShadow: '0 4px 14px rgba(3,105,161,0.25)' }}
            >
              <ChevronLeft className="w-4 h-4 opacity-70" />
              <div className="flex-1 text-right">
                <p className="text-[13px] font-bold">تعديل معلومات الحساب والصورة</p>
                <p className="text-[10px] opacity-70 mt-0.5">الاسم، المدينة، النشاط، الصورة الشخصية</p>
              </div>
              <Pencil className="w-4 h-4 opacity-80" />
            </button>
          )}
          <InfoRow icon={<Phone className="w-3.5 h-3.5 text-[#7a9aab]" />} label="رقم الجوال" value={phone} />
          <InfoRow icon={<Hash className="w-3.5 h-3.5 text-[#7a9aab]" />} label="نوع الحساب" value={roleLabel} />
          {session.profile.company_name && (
            <InfoRow icon={<Building2 className="w-3.5 h-3.5 text-[#7a9aab]" />} label="اسم المنشأة" value={session.profile.company_name} />
          )}
          {session.profile.city && (
            <InfoRow icon={<MapPin className="w-3.5 h-3.5 text-[#7a9aab]" />} label="المدينة" value={session.profile.city} />
          )}
          {session.profile.created_at && (
            <InfoRow
              icon={<Calendar className="w-3.5 h-3.5 text-[#7a9aab]" />}
              label="تاريخ التسجيل"
              value={new Date(session.profile.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
            />
          )}

          <div className="pt-2 border-t border-[#f0f6fa]">
            <p className="text-[11px] font-bold text-[#4a7a94] mb-2">الاسم المعروض</p>
            {!editingName ? (
              <div className="flex items-center justify-between bg-[#f8fbfd] border border-[#e2edf5] rounded-xl px-3 py-2.5">
                <button
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-1.5 text-[#0369A1] active:scale-95 transition-transform"
                >
                  <Pencil className="w-3 h-3" />
                  <span className="text-[11px] font-bold">تعديل</span>
                </button>
                <span className="text-[12px] font-bold text-[#1a3a4a]">{session.profile.display_name || '-'}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-[#0369A1] bg-white text-[13px] font-bold text-[#1a3a4a] text-right outline-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingName(false)}
                    className="flex-1 py-2 rounded-xl bg-gray-100 text-[12px] font-bold text-[#4a6a7e]"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveName}
                    disabled={savingProfile || !newName.trim()}
                    className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ background: nameSaved ? '#16a34a' : 'linear-gradient(135deg, #0369A1, #0284C7)' }}
                  >
                    {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : nameSaved ? <Check className="w-3.5 h-3.5" /> : null}
                    {nameSaved ? 'تم الحفظ' : 'حفظ'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-[#92400E] leading-relaxed">
              رقم الجوال لا يمكن تعديله مباشرة لأنه مرتبط بالتوثيق. تواصل مع الإدارة إذا كنت بحاجة لتغييره.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* 2 — Contact */}
      <SectionCard
        id="contact" openSection={openSection} onToggle={toggleSection}
        title="إعدادات التواصل"
        subtitle="رقم الواتساب للتواصل مع الأطراف"
        iconColor="#059669" iconBg="#ECFDF5"
        icon={<MessageCircle className="w-5 h-5 text-[#059669]" />}
      >
        <div className="p-4 pt-3 space-y-3">
          <p className="text-[12px] text-[#4a7a94] leading-relaxed">
            يُستخدم هذا الرقم للتواصل مع الموردين أو المشترين خلال مراحل الصفقة عبر واتساب.
          </p>
          <InfoRow
            icon={<MessageCircle className="w-3.5 h-3.5 text-[#7a9aab]" />}
            label="رقم الواتساب الحالي"
            value={phone}
          />
          {!whatsappEdit ? (
            <button
              onClick={() => setWhatsappEdit(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-[#e2edf5] bg-white text-[12px] font-bold text-[#1a4a5e] active:scale-[0.97] transition-transform"
            >
              <Pencil className="w-3.5 h-3.5" />
              تحديث رقم الواتساب
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="tel"
                value={whatsappVal}
                onChange={e => setWhatsappVal(e.target.value)}
                placeholder="05XXXXXXXX"
                className="w-full px-3 py-2.5 rounded-xl border-2 border-[#059669] bg-white text-[13px] font-bold text-[#1a3a4a] text-right outline-none"
                autoFocus
                dir="ltr"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setWhatsappEdit(false)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 text-[12px] font-bold text-[#4a6a7e]"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveWhatsApp}
                  disabled={savingProfile}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50"
                  style={{ background: whatsappSaved ? '#16a34a' : 'linear-gradient(135deg, #059669, #047857)' }}
                >
                  {whatsappSaved ? <Check className="w-3.5 h-3.5" /> : null}
                  {whatsappSaved ? 'تم الحفظ' : 'حفظ'}
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* 3 — Notifications */}
      <SectionCard
        id="notifications" openSection={openSection} onToggle={toggleSection}
        title="الإشعارات"
        subtitle="تحكم في التنبيهات والإشعارات"
        iconColor="#B45309" iconBg="#FFFBEB"
        icon={<Bell className="w-5 h-5 text-[#B45309]" />}
      >
        <div className="p-4 pt-3 space-y-3">
          <NotifRow
            label="إشعارات الصفقات"
            desc="تنبيهات عند تحديث حالة الصفقات"
            checked={notifPrefs.deals_notifications}
            onChange={v => updateNotifPrefs({ deals_notifications: v })}
          />
          <div className="border-t border-[#f0f6fa]" />
          <NotifRow
            label="إشعارات الطلبات"
            desc="تنبيهات عند مطابقة طلباتك"
            checked={notifPrefs.orders_notifications}
            onChange={v => updateNotifPrefs({ orders_notifications: v })}
          />
          <div className="border-t border-[#f0f6fa]" />
          <NotifRow
            label="إشعارات المطابقة"
            desc="تنبيهات عند توفر مخزون مطابق"
            checked={notifPrefs.matching_notifications}
            onChange={v => updateNotifPrefs({ matching_notifications: v })}
          />
        </div>
      </SectionCard>

      {/* 4 — Support */}
      <SectionCard
        id="support" openSection={openSection} onToggle={toggleSection}
        title="مركز الدعم"
        subtitle="تواصل مع فريق إدارة المنصة"
        iconColor="#0369A1" iconBg="#E0F2FE"
        icon={<Headphones className="w-5 h-5 text-[#0369A1]" />}
      >
        <div className="p-4 pt-3 space-y-3">
          <a
            href={buildAdminWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full py-3.5 px-4 rounded-2xl text-white active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 14px rgba(37,211,102,0.3)' }}
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 text-right">
              <p className="text-[13px] font-bold">التواصل عبر واتساب</p>
              <p className="text-[10px] opacity-80 mt-0.5">فريقنا متاح لمساعدتك</p>
            </div>
            <MessageCircle className="w-5 h-5 opacity-80 flex-shrink-0" />
          </a>

          <button
            onClick={() => setShowSupportChat(true)}
            className="relative flex items-center gap-3 w-full py-3.5 px-4 rounded-2xl bg-white border-2 border-[#BAE6FD] active:scale-[0.97] transition-transform"
            style={{ boxShadow: '0 2px 8px rgba(3,105,161,0.06)' }}
          >
            <MessageSquare className="w-4 h-4 text-[#0369A1] flex-shrink-0" />
            <div className="flex-1 text-right">
              <p className="text-[13px] font-bold text-[#1a3a4a]">الدردشة المباشرة مع الإدارة</p>
              <p className="text-[10px] text-[#7a9aab] mt-0.5">
                {supportMessages.length > 0
                  ? `${supportMessages.length} رسالة في المحادثة`
                  : 'ابدأ محادثة مع فريق الدعم'}
              </p>
            </div>
            {unreadCount > 0 && (
              <span className="absolute top-3 left-3 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            <ChevronLeft className="w-4 h-4 text-[#9ab0bf] flex-shrink-0" />
          </button>

          <div className="flex items-center gap-2 bg-[#f8fbfd] border border-[#e2edf5] rounded-xl px-3 py-2.5">
            <div className="flex-1 text-right">
              <p className="text-[11px] font-bold text-[#4a7a94]">ساعات الدعم</p>
              <p className="text-[10px] text-[#7a9aab]">الأحد — الخميس من 8 صباحاً حتى 10 مساءً</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 5 — Commission */}
      <SectionCard
        id="commission" openSection={openSection} onToggle={toggleSection}
        title="بيانات سداد عمولة المنصة"
        subtitle="تفاصيل التحويل البنكي"
        iconColor="#92400E" iconBg="#FFFBEB"
        icon={<Banknote className="w-5 h-5 text-[#92400E]" />}
      >
        <div className="p-4 pt-3 space-y-2.5">
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3">
            <p className="text-[11px] text-[#92400E] font-bold leading-relaxed">
              يُرجى تحويل العمولة المستحقة إلى الحساب البنكي التالي وإرسال إشعار التحويل لفريقنا عبر واتساب.
            </p>
          </div>
          <CommissionRow label="اسم المنشأة" value="شبكة الطبليات الوطنية" />
          <CommissionRow label="البنك" value="البنك الأهلي السعودي (SNB)" />
          <CommissionRow label="رقم الحساب" value="1234567890123" mono />
          <div className="flex items-center justify-between gap-3 bg-[#f8fbfd] border border-[#e2edf5] rounded-xl px-3 py-2.5">
            <button
              onClick={handleCopyIBAN}
              className="flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              {ibanCopied
                ? <><Check className="w-3.5 h-3.5 text-[#059669]" /><span className="text-[11px] font-bold text-[#059669]">تم النسخ</span></>
                : <><Copy className="w-3.5 h-3.5 text-[#0369A1]" /><span className="text-[11px] font-bold text-[#0369A1]">نسخ الآيبان</span></>
              }
            </button>
            <div className="text-right">
              <p className="text-[10px] text-[#7a9aab] mb-0.5">رقم الآيبان</p>
              <p className="text-[11px] font-bold text-[#1a3a4a] font-mono" dir="ltr">SA10 2000 0001 2345 6789 0123</p>
            </div>
          </div>
          <CommissionRow label="العملة" value="ريال سعودي (SAR)" />
        </div>
      </SectionCard>

      {/* 6 — Suggestions */}
      <SectionCard
        id="suggestions" openSection={openSection} onToggle={toggleSection}
        title="اقتراحات وتحسين المنصة"
        subtitle="شاركنا اقتراحاتك أو مشكلة تحتاج معالجتها"
        iconColor="#7c3aed" iconBg="#F5F3FF"
        icon={<Lightbulb className="w-5 h-5 text-[#7c3aed]" />}
      >
        <div className="p-4 pt-3 space-y-3">
          <div className="bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl p-3">
            <p className="text-[11px] text-[#5b21b6] leading-relaxed">
              نسعد باقتراحاتكم لتحسين المنصة أو الإبلاغ عن مشاكل تحتاج معالجتها. كل اقتراح يُراجع من فريق التطوير.
            </p>
          </div>

          {suggestionSent ? (
            <div className="flex items-center gap-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-4 py-3">
              <Check className="w-5 h-5 text-[#059669] flex-shrink-0" />
              <p className="text-[12px] font-bold text-[#059669]">تم إرسال اقتراحك بنجاح. شكراً على مشاركتك!</p>
            </div>
          ) : (
            <>
              <textarea
                value={suggestionText}
                onChange={e => setSuggestionText(e.target.value)}
                placeholder="اكتب اقتراحك أو المشكلة التي واجهتها..."
                rows={4}
                className="w-full resize-none px-3 py-2.5 rounded-xl border-2 border-[#e2edf5] bg-[#f8fbfd] focus:border-[#7c3aed] focus:bg-white text-[12px] text-[#1a3a4a] text-right outline-none transition-colors leading-relaxed"
              />
              {suggestionError && (
                <p className="text-[11px] text-red-600 font-bold">{suggestionError}</p>
              )}
              <button
                onClick={handleSendSuggestion}
                disabled={sendingSuggestion || !suggestionText.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 14px rgba(124,58,237,0.2)' }}
              >
                {sendingSuggestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                إرسال الاقتراح
              </button>
            </>
          )}
        </div>
      </SectionCard>

      {/* 7 — Security */}
      <SectionCard
        id="security" openSection={openSection} onToggle={toggleSection}
        title="الأمان"
        subtitle="إدارة أمان حسابك"
        iconColor="#dc2626" iconBg="#FEF2F2"
        icon={<Shield className="w-5 h-5 text-[#dc2626]" />}
      >
        <div className="p-4 pt-3 space-y-3">
          <div className="flex items-center justify-between bg-[#f8fbfd] border border-[#e2edf5] rounded-xl px-3 py-2.5">
            <span className="text-[12px] font-bold text-[#1a3a4a]">
              {session.profile.last_active
                ? new Date(session.profile.last_active).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'غير متاح'}
            </span>
            <span className="text-[11px] text-[#7a9aab]">آخر تسجيل دخول</span>
          </div>

          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3">
            <p className="text-[11px] font-bold text-[#92400E] mb-1">لتغيير رمز الدخول (PIN)</p>
            <p className="text-[10px] text-[#B45309] leading-relaxed">
              سجّل الخروج ثم اختر "نسيت رمز الدخول" لإعادة تعيينه، أو تواصل مع الإدارة.
            </p>
          </div>

          {!showLogoutConfirm ? (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#FECACA] bg-[#FEF2F2] text-[13px] font-bold text-[#dc2626] active:scale-[0.97] transition-transform"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          ) : (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 space-y-3">
              <p className="text-[13px] font-black text-[#dc2626] text-center">هل تريد تسجيل الخروج؟</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-[12px] font-bold text-[#6b7280]"
                >
                  إلغاء
                </button>
                <button
                  onClick={onLogout}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white"
                  style={{ background: '#dc2626' }}
                >
                  تسجيل الخروج
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* 8 — Delete Account */}
      <SectionCard
        id="delete" openSection={openSection} onToggle={toggleSection}
        title="حذف الحساب"
        subtitle="إجراء دائم لا يمكن التراجع عنه"
        iconColor="#991b1b" iconBg="#FEF2F2"
        icon={<Trash2 className="w-5 h-5 text-[#991b1b]" />}
      >
        <div className="p-4 pt-3 space-y-3">
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#dc2626] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#991b1b] leading-relaxed">
              حذف الحساب إجراء دائم لا يمكن التراجع عنه. سيتم حذف جميع بياناتك وطلباتك وصفقاتك نهائياً.
            </p>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#FECACA] bg-white text-[12px] font-bold text-[#991b1b] active:scale-[0.97] transition-transform"
            >
              <Trash2 className="w-3.5 h-3.5" />
              طلب حذف الحساب
            </button>
          ) : (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4 space-y-3">
              <p className="text-[13px] font-black text-[#991b1b] text-center">تأكيد طلب الحذف</p>
              <p className="text-[11px] text-[#b91c1c] text-center leading-relaxed">
                سيُرسل طلب الحذف لفريقنا للمراجعة. يمكنك التواصل معنا لإلغاء الطلب خلال 48 ساعة.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-[12px] font-bold text-[#6b7280]"
                >
                  تراجع
                </button>
                <a
                  href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(`طلب حذف حساب - رقم الجوال: ${phone}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white text-center flex items-center justify-center"
                  style={{ background: '#991b1b' }}
                >
                  إرسال الطلب
                </a>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <p className="text-[10px] text-[#b0c4d0] text-center pb-4">
        شبكة الطبليات الوطنية — الإصدار 2.0
      </p>
    </div>
  );
}
