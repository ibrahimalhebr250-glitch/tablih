import { User, Star, Award, TrendingUp, Shield } from 'lucide-react';
import type { AppSession } from '../../../types/session';

interface Props {
  session: AppSession;
}

export default function ProfileHeader({ session }: Props) {
  const displayName = session.profile.company_name || session.profile.display_name || session.profile.phone;
  const trustRating = session.profile.trust_rating || 5.0;
  const isSupplier = session.roles.includes('supplier');
  const isBuyer = session.roles.includes('buyer');

  const getUserType = () => {
    if (isSupplier && isBuyer) return 'مورّد ومشتري';
    if (isSupplier) return 'مورّد';
    if (isBuyer) return 'مشتري';
    return 'زائر';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return { bg: '#D1FAE5', text: '#10B981', border: '#A7F3D0' };
    if (rating >= 3.5) return { bg: '#FEF3C7', text: '#F59E0B', border: '#FDE68A' };
    return { bg: '#FEE2E2', text: '#EF4444', border: '#FECACA' };
  };

  const ratingColors = getRatingColor(trustRating);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a4a5e] via-[#2c5f7c] to-[#1a4a5e] p-6 shadow-2xl">
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl flex items-center justify-center border-2 border-white/30 shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-[#27AE60] to-[#229954] rounded-lg flex items-center justify-center shadow-lg">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-[20px] font-black text-white mb-1">{displayName}</h2>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-xl border border-white/30">
                  <p className="text-[11px] font-bold text-white">{getUserType()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-3 text-center">
            <div
              className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: ratingColors.bg }}
            >
              <Star className="w-5 h-5" style={{ color: ratingColors.text }} fill="currentColor" />
            </div>
            <p className="text-[16px] font-black text-white">{trustRating.toFixed(1)}</p>
            <p className="text-[9px] font-bold text-white/70">التقييم</p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-3 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-blue-300" />
            </div>
            <p className="text-[16px] font-black text-white">{session.profile.completed_deals || 0}</p>
            <p className="text-[9px] font-bold text-white/70">صفقة منجزة</p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-3 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-300" />
            </div>
            <p className="text-[16px] font-black text-white">نشط</p>
            <p className="text-[9px] font-bold text-white/70">الحالة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
