import type { Deal } from '../types/deal';

export function buildWhatsAppLink(phone: string, senderRole: 'supplier' | 'buyer', deal: Deal, templateText?: string): string {
  const cleanPhone = phone.replace(/^0/, '966').replace('+', '');
  const myRole = senderRole === 'supplier' ? 'المورد' : 'المشتري';
  const otherRole = senderRole === 'supplier' ? 'المشتري' : 'المورد';

  let message: string;
  if (templateText) {
    message = templateText
      .replace(/{{deal_ref}}/g, deal.deal_ref)
      .replace(/{{pallet_type}}/g, deal.pallet_type)
      .replace(/{{size}}/g, deal.size)
      .replace(/{{quality}}/g, deal.quality)
      .replace(/{{quantity}}/g, String(deal.quantity))
      .replace(/{{city}}/g, deal.city)
      .replace(/{{price}}/g, String(deal.supplier_price ?? deal.final_price))
      .replace(/{{my_role}}/g, myRole)
      .replace(/{{other_role}}/g, otherRole);
  } else {
    message = [
      `السلام عليكم`,
      ``,
      `تواصل معك عبر *منصة العاديات* بخصوص الصفقة رقم *${deal.deal_ref}*`,
      ``,
      `--- تفاصيل الصفقة ---`,
      `النوع: ${deal.pallet_type} · ${deal.size} · درجة ${deal.quality}`,
      `الكمية: ${deal.quantity} طبلية`,
      `المدينة: ${deal.city}`,
      `السعر: ${(deal.supplier_price ?? deal.final_price)} ر.س / طبلية`,
      ``,
      `انا ${myRole} في هذه الصفقة وأنت ${otherRole}`,
      ``,
      `شكرا لتعاملك مع منصة العاديات`,
    ].join('\n');
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
