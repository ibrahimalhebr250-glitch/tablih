export type Language = 'ar' | 'en';

export interface TranslationKeys {
  common: {
    welcome: string;
    login: string;
    logout: string;
    register: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    search: string;
    filter: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    close: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    update: string;
    create: string;
    view: string;
    download: string;
    upload: string;
    select: string;
    all: string;
    none: string;
    or: string;
    and: string;
  };
  navigation: {
    marketplace: string;
    orders: string;
    inventory: string;
    deals: string;
    account: string;
    admin: string;
    dashboard: string;
  };
  auth: {
    phoneNumber: string;
    pin: string;
    name: string;
    userType: string;
    company: string;
    individual: string;
    loginTitle: string;
    registerTitle: string;
    forgotPin: string;
    dontHaveAccount: string;
    alreadyHaveAccount: string;
  };
  marketplace: {
    title: string;
    searchPlaceholder: string;
    noResults: string;
    supply: string;
    demand: string;
    viewDetails: string;
    addToOrder: string;
  };
  orders: {
    title: string;
    createOrder: string;
    myOrders: string;
    orderDetails: string;
    quantity: string;
    palletType: string;
    palletSize: string;
    quality: string;
    condition: string;
    city: string;
    price: string;
    status: string;
    pending: string;
    matched: string;
    completed: string;
    cancelled: string;
  };
  inventory: {
    title: string;
    addInventory: string;
    myInventory: string;
    available: string;
    reserved: string;
    sold: string;
    description: string;
    images: string;
    pricePerPallet: string;
  };
  deals: {
    title: string;
    myDeals: string;
    dealDetails: string;
    buyer: string;
    supplier: string;
    confirm: string;
    cancel: string;
    pending: string;
    confirmed: string;
    inDelivery: string;
    completed: string;
    cancelled: string;
    failed: string;
  };
  admin: {
    title: string;
    dashboard: string;
    users: string;
    settings: string;
    analytics: string;
    reports: string;
    backups: string;
    invoices: string;
  };
}

const translations: Record<Language, TranslationKeys> = {
  ar: {
    common: {
      welcome: 'مرحباً',
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      register: 'إنشاء حساب',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      search: 'بحث',
      filter: 'تصفية',
      loading: 'جاري التحميل...',
      error: 'حدث خطأ',
      success: 'تم بنجاح',
      confirm: 'تأكيد',
      close: 'إغلاق',
      back: 'رجوع',
      next: 'التالي',
      previous: 'السابق',
      submit: 'إرسال',
      update: 'تحديث',
      create: 'إنشاء',
      view: 'عرض',
      download: 'تحميل',
      upload: 'رفع',
      select: 'اختيار',
      all: 'الكل',
      none: 'لا يوجد',
      or: 'أو',
      and: 'و',
    },
    navigation: {
      marketplace: 'السوق',
      orders: 'الطلبات',
      inventory: 'المخزون',
      deals: 'الصفقات',
      account: 'الحساب',
      admin: 'الإدارة',
      dashboard: 'لوحة التحكم',
    },
    auth: {
      phoneNumber: 'رقم الجوال',
      pin: 'الرمز السري',
      name: 'الاسم',
      userType: 'نوع المستخدم',
      company: 'شركة',
      individual: 'فرد',
      loginTitle: 'تسجيل الدخول',
      registerTitle: 'إنشاء حساب جديد',
      forgotPin: 'نسيت الرمز السري؟',
      dontHaveAccount: 'ليس لديك حساب؟',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
    },
    marketplace: {
      title: 'سوق الطبليات',
      searchPlaceholder: 'ابحث عن طبليات...',
      noResults: 'لا توجد نتائج',
      supply: 'العرض',
      demand: 'الطلب',
      viewDetails: 'عرض التفاصيل',
      addToOrder: 'إضافة للطلب',
    },
    orders: {
      title: 'الطلبات',
      createOrder: 'إنشاء طلب جديد',
      myOrders: 'طلباتي',
      orderDetails: 'تفاصيل الطلب',
      quantity: 'الكمية',
      palletType: 'نوع الطبلية',
      palletSize: 'حجم الطبلية',
      quality: 'الجودة',
      condition: 'الحالة',
      city: 'المدينة',
      price: 'السعر',
      status: 'الحالة',
      pending: 'قيد الانتظار',
      matched: 'تم المطابقة',
      completed: 'مكتمل',
      cancelled: 'ملغي',
    },
    inventory: {
      title: 'المخزون',
      addInventory: 'إضافة مخزون',
      myInventory: 'مخزوني',
      available: 'متاح',
      reserved: 'محجوز',
      sold: 'مباع',
      description: 'الوصف',
      images: 'الصور',
      pricePerPallet: 'سعر الطبلية',
    },
    deals: {
      title: 'الصفقات',
      myDeals: 'صفقاتي',
      dealDetails: 'تفاصيل الصفقة',
      buyer: 'المشتري',
      supplier: 'المورد',
      confirm: 'تأكيد',
      cancel: 'إلغاء',
      pending: 'قيد الانتظار',
      confirmed: 'مؤكدة',
      inDelivery: 'قيد التوصيل',
      completed: 'مكتملة',
      cancelled: 'ملغاة',
      failed: 'فشلت',
    },
    admin: {
      title: 'لوحة الإدارة',
      dashboard: 'الرئيسية',
      users: 'المستخدمون',
      settings: 'الإعدادات',
      analytics: 'التحليلات',
      reports: 'التقارير',
      backups: 'النسخ الاحتياطية',
      invoices: 'الفواتير',
    },
  },
  en: {
    common: {
      welcome: 'Welcome',
      login: 'Login',
      logout: 'Logout',
      register: 'Register',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      filter: 'Filter',
      loading: 'Loading...',
      error: 'Error occurred',
      success: 'Success',
      confirm: 'Confirm',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      submit: 'Submit',
      update: 'Update',
      create: 'Create',
      view: 'View',
      download: 'Download',
      upload: 'Upload',
      select: 'Select',
      all: 'All',
      none: 'None',
      or: 'Or',
      and: 'And',
    },
    navigation: {
      marketplace: 'Marketplace',
      orders: 'Orders',
      inventory: 'Inventory',
      deals: 'Deals',
      account: 'Account',
      admin: 'Admin',
      dashboard: 'Dashboard',
    },
    auth: {
      phoneNumber: 'Phone Number',
      pin: 'PIN',
      name: 'Name',
      userType: 'User Type',
      company: 'Company',
      individual: 'Individual',
      loginTitle: 'Login',
      registerTitle: 'Create New Account',
      forgotPin: 'Forgot PIN?',
      dontHaveAccount: "Don't have an account?",
      alreadyHaveAccount: 'Already have an account?',
    },
    marketplace: {
      title: 'Pallet Marketplace',
      searchPlaceholder: 'Search for pallets...',
      noResults: 'No results found',
      supply: 'Supply',
      demand: 'Demand',
      viewDetails: 'View Details',
      addToOrder: 'Add to Order',
    },
    orders: {
      title: 'Orders',
      createOrder: 'Create New Order',
      myOrders: 'My Orders',
      orderDetails: 'Order Details',
      quantity: 'Quantity',
      palletType: 'Pallet Type',
      palletSize: 'Pallet Size',
      quality: 'Quality',
      condition: 'Condition',
      city: 'City',
      price: 'Price',
      status: 'Status',
      pending: 'Pending',
      matched: 'Matched',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    inventory: {
      title: 'Inventory',
      addInventory: 'Add Inventory',
      myInventory: 'My Inventory',
      available: 'Available',
      reserved: 'Reserved',
      sold: 'Sold',
      description: 'Description',
      images: 'Images',
      pricePerPallet: 'Price Per Pallet',
    },
    deals: {
      title: 'Deals',
      myDeals: 'My Deals',
      dealDetails: 'Deal Details',
      buyer: 'Buyer',
      supplier: 'Supplier',
      confirm: 'Confirm',
      cancel: 'Cancel',
      pending: 'Pending',
      confirmed: 'Confirmed',
      inDelivery: 'In Delivery',
      completed: 'Completed',
      cancelled: 'Cancelled',
      failed: 'Failed',
    },
    admin: {
      title: 'Admin Panel',
      dashboard: 'Dashboard',
      users: 'Users',
      settings: 'Settings',
      analytics: 'Analytics',
      reports: 'Reports',
      backups: 'Backups',
      invoices: 'Invoices',
    },
  },
};

class I18n {
  private currentLanguage: Language = 'ar';
  private listeners: Array<(lang: Language) => void> = [];

  constructor() {
    const savedLang = localStorage.getItem('app_language') as Language;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      this.currentLanguage = savedLang;
    }
    this.updateDocumentDirection();
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  setLanguage(lang: Language) {
    this.currentLanguage = lang;
    localStorage.setItem('app_language', lang);
    this.updateDocumentDirection();
    this.notifyListeners();
  }

  t(key: string): string {
    const keys = key.split('.');
    let value: any = translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }

  subscribe(listener: (lang: Language) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentLanguage));
  }

  private updateDocumentDirection() {
    document.documentElement.dir = this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = this.currentLanguage;
  }

  isRTL(): boolean {
    return this.currentLanguage === 'ar';
  }
}

export const i18n = new I18n();

export function useTranslation() {
  return {
    t: (key: string) => i18n.t(key),
    language: i18n.getLanguage(),
    setLanguage: (lang: Language) => i18n.setLanguage(lang),
    isRTL: i18n.isRTL(),
  };
}
