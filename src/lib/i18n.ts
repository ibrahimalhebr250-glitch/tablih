import { useState, useEffect } from 'react';

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
    home: string;
    marketplace: string;
    orders: string;
    inventory: string;
    deals: string;
    account: string;
    admin: string;
    dashboard: string;
    addInventory: string;
    createOrder: string;
    myAccount: string;
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
    subtitle: string;
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
    partiallyMatched: string;
    completed: string;
    cancelled: string;
    fulfilled: string;
    activeOrders: string;
    executedOrders: string;
    newOrder: string;
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
    cloudWarehouse: string;
    myPurchases: string;
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
    soldMatched: string;
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
  language: {
    switchLabel: string;
    arabic: string;
    english: string;
  };
  hero: {
    networkConnected: string;
    palletPlatform: string;
    slide1Title: string;
    slide1Subtitle: string;
    slide2Title: string;
    slide2Subtitle: string;
    slide3Title: string;
    slide3Subtitle: string;
    instantMatching: string;
    activeMarket: string;
    secureTransactions: string;
    connected: string;
  };
  quickActions: {
    addInventoryTitle: string;
    addInventoryDesc: string;
    createOrderTitle: string;
    createOrderDesc: string;
  };
  account: {
    myWarehouse: string;
    deals: string;
    myOrders: string;
    settings: string;
    defaultUser: string;
    logout: string;
    logoutConfirm: string;
    logoutConfirmDesc: string;
    editProfile: string;
    trustedSince: string;
    supplier: string;
    buyer: string;
    company: string;
    individual: string;
  };
  time: {
    now: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    am: string;
    pm: string;
  };
  market: {
    purchaseRequest: string;
    supplyOffer: string;
    qualityA: string;
    qualityB: string;
    qualityC: string;
    qualityScrap: string;
    pallets: string;
    flexible: string;
    nearbyCity: string;
    partial: string;
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
    cloudWarehouse: string;
    myPurchases: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
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
      home: 'الرئيسية',
      marketplace: 'السوق',
      orders: 'الطلبات',
      inventory: 'المخزون',
      deals: 'الصفقات',
      account: 'الحساب',
      admin: 'الإدارة',
      dashboard: 'لوحة التحكم',
      addInventory: 'إضافة مخزون',
      createOrder: 'إنشاء طلب',
      myAccount: 'حسابي',
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
      subtitle: 'منصة توريد الطبليات',
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
      matched: 'تمت المطابقة',
      partiallyMatched: 'مطابقة جزئية',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      fulfilled: 'تم التنفيذ',
      activeOrders: 'الطلبات النشطة',
      executedOrders: 'طلبات تم تنفيذها',
      newOrder: 'طلب جديد',
    },
    inventory: {
      title: 'المخزون',
      addInventory: 'إضافة مخزون',
      myInventory: 'مخزوني',
      available: 'متاح',
      reserved: 'محجوز',
      sold: 'تم البيع',
      description: 'الوصف',
      images: 'الصور',
      pricePerPallet: 'سعر الطبلية',
      cloudWarehouse: 'المستودع السحابي',
      myPurchases: 'مشترياتي',
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
      soldMatched: 'تم البيع / تمت المطابقة',
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
    language: {
      switchLabel: 'اللغة',
      arabic: 'العربية',
      english: 'English',
    },
    hero: {
      networkConnected: 'الشبكة متصلة',
      palletPlatform: 'منصة تجارة الطبليات',
      slide1Title: 'شبكة تدفق الطلبات',
      slide1Subtitle: 'ربط الموردين بالمشترين عبر شبكة وطنية ذكية',
      slide2Title: 'مطابقة فورية وذكية',
      slide2Subtitle: 'نظام ذكي متقدم يربط العروض بالطلبات في ثوانٍ',
      slide3Title: 'سوق موثوق وآمن',
      slide3Subtitle: 'معاملات مضمونة وتقييمات شفافة لجميع الأطراف',
      instantMatching: 'مطابقة فورية',
      activeMarket: 'سوق نشط',
      secureTransactions: 'معاملات آمنة',
      connected: 'متصل',
    },
    quickActions: {
      addInventoryTitle: 'إضافة مخزون',
      addInventoryDesc: 'سجّل طبلياتك وتلقى عروض فورية',
      createOrderTitle: 'إنشاء طلب',
      createOrderDesc: 'حدد احتياجك ونطابقك بالمورد',
    },
    account: {
      myWarehouse: 'مستودعي',
      deals: 'الصفقات',
      myOrders: 'طلباتي',
      settings: 'الإعدادات',
      defaultUser: 'مستخدم',
      logout: 'تسجيل الخروج',
      logoutConfirm: 'تسجيل الخروج',
      logoutConfirmDesc: 'هل تريد تسجيل الخروج من حسابك؟',
      editProfile: 'تعديل الملف الشخصي',
      trustedSince: 'عضو موثوق',
      supplier: 'مورد',
      buyer: 'مشتري',
      company: 'شركة',
      individual: 'فرد',
    },
    time: {
      now: 'الآن',
      minutesAgo: 'منذ {{count}} دقيقة',
      hoursAgo: 'منذ {{count}} ساعة',
      daysAgo: 'منذ {{count}} يوم',
      am: 'ص',
      pm: 'م',
    },
    market: {
      purchaseRequest: 'طلب شراء',
      supplyOffer: 'عرض توريد',
      qualityA: 'درجة A',
      qualityB: 'درجة B',
      qualityC: 'درجة C',
      qualityScrap: 'خردة',
      pallets: 'طبلية',
      flexible: 'جودة مرنة',
      nearbyCity: 'مدينة مجاورة',
      partial: 'جزئي',
    },
    inventory: {
      title: 'المخزون',
      addInventory: 'إضافة مخزون',
      myInventory: 'مخزوني',
      available: 'متاح',
      reserved: 'محجوز',
      sold: 'تم البيع',
      description: 'الوصف',
      images: 'الصور',
      pricePerPallet: 'سعر الطبلية',
      cloudWarehouse: 'المستودع السحابي',
      myPurchases: 'مشترياتي',
      step1: 'معلومات الطبلية',
      step2: 'الكمية والمدينة',
      step3: 'الصور والوصف',
      step4: 'معاينة ونشر',
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
      home: 'Home',
      marketplace: 'Marketplace',
      orders: 'Orders',
      inventory: 'Inventory',
      deals: 'Deals',
      account: 'Account',
      admin: 'Admin',
      dashboard: 'Dashboard',
      addInventory: 'Add Inventory',
      createOrder: 'New Order',
      myAccount: 'My Account',
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
      title: 'Pallet Market',
      subtitle: 'Pallet Supply Platform',
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
      partiallyMatched: 'Partially Matched',
      completed: 'Completed',
      cancelled: 'Cancelled',
      fulfilled: 'Fulfilled',
      activeOrders: 'Active Orders',
      executedOrders: 'Executed Orders',
      newOrder: 'New Order',
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
      cloudWarehouse: 'Cloud Warehouse',
      myPurchases: 'My Purchases',
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
      soldMatched: 'Sold / Matched',
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
    language: {
      switchLabel: 'Language',
      arabic: 'العربية',
      english: 'English',
    },
    hero: {
      networkConnected: 'Network Connected',
      palletPlatform: 'Pallet Trading Platform',
      slide1Title: 'Order Flow Network',
      slide1Subtitle: 'Connecting suppliers with buyers through a smart national network',
      slide2Title: 'Instant Smart Matching',
      slide2Subtitle: 'Advanced intelligent system connecting offers to orders in seconds',
      slide3Title: 'Trusted & Secure Market',
      slide3Subtitle: 'Guaranteed transactions and transparent ratings for all parties',
      instantMatching: 'Instant Matching',
      activeMarket: 'Active Market',
      secureTransactions: 'Secure Transactions',
      connected: 'Connected',
    },
    quickActions: {
      addInventoryTitle: 'Add Inventory',
      addInventoryDesc: 'Register your pallets and receive instant offers',
      createOrderTitle: 'Create Order',
      createOrderDesc: 'Specify your needs and match with a supplier',
    },
    account: {
      myWarehouse: 'My Warehouse',
      deals: 'Deals',
      myOrders: 'My Orders',
      settings: 'Settings',
      defaultUser: 'User',
      logout: 'Logout',
      logoutConfirm: 'Logout',
      logoutConfirmDesc: 'Are you sure you want to logout?',
      editProfile: 'Edit Profile',
      trustedSince: 'Trusted Member',
      supplier: 'Supplier',
      buyer: 'Buyer',
      company: 'Company',
      individual: 'Individual',
    },
    time: {
      now: 'Now',
      minutesAgo: '{{count}} min ago',
      hoursAgo: '{{count}} hr ago',
      daysAgo: '{{count}} days ago',
      am: 'AM',
      pm: 'PM',
    },
    market: {
      purchaseRequest: 'Purchase Request',
      supplyOffer: 'Supply Offer',
      qualityA: 'Grade A',
      qualityB: 'Grade B',
      qualityC: 'Grade C',
      qualityScrap: 'Scrap',
      pallets: 'pallets',
      flexible: 'Flexible Quality',
      nearbyCity: 'Nearby City',
      partial: 'Partial',
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
      cloudWarehouse: 'Cloud Warehouse',
      myPurchases: 'My Purchases',
      step1: 'Pallet Information',
      step2: 'Quantity & City',
      step3: 'Images & Description',
      step4: 'Preview & Publish',
    },
  },
};

class I18nManager {
  private currentLanguage: Language = 'ar';
  private listeners: Set<() => void> = new Set();

  constructor() {
    const savedLang = localStorage.getItem('app_language') as Language;
    if (savedLang === 'ar' || savedLang === 'en') {
      this.currentLanguage = savedLang;
    }
    this.applyDirection();
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  setLanguage(lang: Language) {
    this.currentLanguage = lang;
    localStorage.setItem('app_language', lang);
    this.applyDirection();
    this.listeners.forEach(fn => fn());
  }

  t(key: string): string {
    const keys = key.split('.');
    let value: any = translations[this.currentLanguage];
    for (const k of keys) {
      if (value && typeof value === 'object') value = value[k];
      else return key;
    }
    return typeof value === 'string' ? value : key;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private applyDirection() {
    document.documentElement.dir = this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = this.currentLanguage;
  }

  isRTL(): boolean {
    return this.currentLanguage === 'ar';
  }
}

export const i18n = new I18nManager();

export function useTranslation() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubscribe = i18n.subscribe(() => forceUpdate(n => n + 1));
    return unsubscribe;
  }, []);

  return {
    t: (key: string) => i18n.t(key),
    language: i18n.getLanguage(),
    setLanguage: (lang: Language) => i18n.setLanguage(lang),
    isRTL: i18n.isRTL(),
  };
}
