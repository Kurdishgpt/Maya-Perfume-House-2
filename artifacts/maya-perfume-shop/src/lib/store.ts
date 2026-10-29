import type { Product as ApiProduct } from '@workspace/api-client-react';

export type Language = 'en' | 'ku' | 'ar';
export type StoreProduct = ApiProduct & { image_url: string; gallery_images: string[] };
export type CartLine = { product: StoreProduct; quantity: number; size: number };
export type T = (key: string) => string;
export type CategoryKey = 'all' | 'women' | 'men' | 'perfect';
export type FamilyKey = 'all' | 'floral' | 'woody' | 'fruity' | 'oriental';

export const IQD_PER_USD = 1500;
export const storePhone = '+964 770 157 5609';
export const storePhoneHref = 'tel:+9647701575609';
export const storeAddress = 'Kolak Mall, Mawlawi Street, Sulaymaniyah, Iraq.';
export const storeMapLink = 'https://www.google.com/maps/search/?api=1&query=Kolak+Mall%2C+Mawlawi+Street%2C+Sulaymaniyah%2C+Iraq';
export const whatsappNumber = '9647701575609';
export const whatsappLink = `https://wa.me/${whatsappNumber}`;
/** Configurable: replace with the real Maya Collection Instagram profile URL. */
export const instagramLink = 'https://instagram.com/';
export const sizes = [25, 50, 100, 150, 200];
export const languages: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' }, { code: 'ku', label: 'کوردی' }, { code: 'ar', label: 'العربية' },
];

export const formatIQD = (usd: number) => `${new Intl.NumberFormat('en-US').format(Math.round(usd * IQD_PER_USD))} IQD`;

const categoryPatterns: Record<Exclude<CategoryKey, 'all'>, RegExp> = {
  women: /\b(women|woman|womens|female|femme|her|ladies|lady)\b|women's/i,
  men: /\b(men|man|mens|male|homme|him|gentlemen)\b|men's/i,
  perfect: /(unisex|perfect|shared|everyone)/i,
};
export const inCategory = (p: ApiProduct, key: CategoryKey) => key === 'all' || categoryPatterns[key].test(`${p.category} ${p.title}`);

const familyPatterns: Record<Exclude<FamilyKey, 'all'>, RegExp> = {
  floral: /(flor|flower|rose|jasmin|peony|lily|iris|tuberose|blossom|violet|gardenia|magnolia|ylang|lavender)/i,
  woody: /(wood|cedar|sandal|vetiver|oud|patchouli|birch|pine|cypress|guaiac)/i,
  fruity: /(fruit|berry|apple|pear|peach|citrus|bergamot|lemon|orange|plum|mango|lychee|grapefruit|cassis|fig)/i,
  oriental: /(oriental|amber|vanilla|spice|spicy|incense|musk|saffron|resin|tonka|benzoin|myrrh|cinnamon|cardamom)/i,
};
export const inFamily = (p: ApiProduct, key: FamilyKey) => key === 'all' || familyPatterns[key].test([p.category, p.description, ...p.top_notes, ...p.heart_notes, ...p.base_notes, ...p.ingredients].join(' '));

const en: Record<string, string> = {
  home:'Home', explore:'Explore', wishlist:'Wishlist', bags:'Bags', about:'About Us', collection:'Shop', ingredients:'Raw Materials', contact:'Contact Us', language:'Language', menu:'Open menu', closeMenu:'Close menu', close:'Close', back:'Back',
  banner:'We deliver to all cities and towns in Kurdistan',
  welcomeTitle1:'Discover Your', welcomeTitle2:'Signature', welcomeBody:'Luxury perfumes for every mood, every moment.', getStarted:'Get Started',
  brandTagline:'Discover your signature collection scent', newArrivals:'New Arrivals', bannerTitle:'Exquisite Scents For a Regal Aura', shopNow:'Shop Now',
  categories:'Categories', women:'Women', men:'Men', perfect:'Perfect', rawMaterials:'Raw Materials', ourStore:'Our Store',
  noProducts:'Our collection is being refreshed. Please visit again shortly.', loading:'Finding your collection', loadError:'We could not refresh the live collection.', retry:'Try again',
  shop_all:'All Fragrances', shop_women:"Women's Fragrances", shop_men:"Men's Fragrances", shop_perfect:'Perfect Pairings',
  search_all:'Search perfumes...', search_women:"Search women's perfumes...", search_men:"Search men's perfumes...", search_perfect:'Search perfect pairings...',
  filters:'Filters', fam_all:'All', fam_floral:'Floral', fam_woody:'Woody', fam_fruity:'Fruity', fam_oriental:'Oriental',
  sort:'Sort', sortFeatured:'Featured', sortLow:'Price: low to high', sortHigh:'Price: high to low', brand:'Brand', allBrands:'All brands', category:'Category', inStockOnly:'In stock only', results:'fragrances', clearFilters:'Clear filters', noMatch:'No fragrance matches yet. Try another search or filter.', apply:'Show results',
  add:'Add to Bag', added:'Added to your bag', viewBag:'View bag', stock:'Available', soldOut:'Currently unavailable', sku:'Code', volume:'Size', quantity:'Quantity', notes:'Fragrance notes', top:'Top', heart:'Heart', base:'Base', ingredientsTitle:'Ingredients', description:'The story of this scent',
  currencyNote:'Approximate local price · 1 USD = 1,500 IQD', exchange:'Approximate conversion only. Not a live exchange rate.',
  yourBag:'Your Bag', emptyBag:'Your bag is waiting for a scent that feels like you.', emptyWish:'Your wishlist is a little quiet.', browse:'Browse the collection', saved:'Saved fragrances', remove:'Remove',
  subtotal:'Subtotal', delivery:'Delivery', deliveryValue:'Confirmed on WhatsApp', totalBefore:'Total before delivery', proceed:'Proceed to Checkout',
  checkoutTitle:'Checkout', stepDetails:'Details', stepReview:'Review', stepDone:'Sent', name:'Full name', phone:'Phone number', city:'City', address:'Delivery address', notesField:'Delivery notes (optional)',
  payment:'Payment method', payWhatsapp:'Arrange payment with Maya on WhatsApp', payNote:'No online payment is taken on this site.', required:'Please fill in this field.', invalidPhone:'Please enter a valid phone number.',
  reviewOrder:'Review order', editDetails:'Edit details', orderSummary:'Order summary', sendWhatsapp:'Send order on WhatsApp',
  receiptNote:'Your itemized order opens in WhatsApp, ready for you to review and send.',
  confirmTitle:'Your order is ready in WhatsApp', confirmBody:'Send the prepared message in WhatsApp. Your order is confirmed once Maya Collection replies. No payment has been taken.', reopen:'Open WhatsApp again', clearBag:'Clear bag and continue',
  order:'Maya Collection order', size:'Size', total:'Total', customer:'Customer', deliveryAddr:'Delivery address',
  pages:'Pages', support:'Customer Support', faq:'Frequently Asked Questions', shipping:'Shipping Information', returns:'Returns and Refunds', contactSupport:'Contact Support', privacy:'Privacy Policy', terms:'Terms and Conditions',
  contactInfo:'Contact', storeName:'Maya collection perfumes', map:'Find us on Maps', followUs:'Follow us on', rights:'© MAYA COLLECTION. All rights reserved.', admin:'Admin',
  aboutTitle:'Fragrance, made personal.', aboutBody:'Maya Collection is a Sulaymaniyah fragrance house built around a simple idea: the right scent should feel like it has always belonged to you.',
  rawTitle:'The notes behind the feeling.', rawBody:'From the first bright impression to the warmth that stays close, every fragrance is a small composition with a story.',
  contactTitle:'Let us find your scent.', contactBody:'Tell us what you love and our team in Sulaymaniyah will help you choose. We are always happy to talk fragrance.',
  faqTitle:'How ordering works', faqBody:'Add fragrances to your bag, fill in your details and send the prepared message on WhatsApp. Our team replies to confirm availability, delivery and payment.',
  shippingTitle:'Delivery across Kurdistan', shippingBody:'We deliver to all cities and towns in Kurdistan. Delivery cost and timing are confirmed with you on WhatsApp before your order is final.',
  returnsTitle:'Returns and refunds', returnsBody:'For questions about an order, an exchange or a refund, contact our team on WhatsApp or call the store. Each request is handled personally.',
  privacyTitle:'Your privacy', privacyBody:'Your bag, wishlist and language are saved only in this browser. Order details are shared only when you choose to send them to us on WhatsApp.',
  termsTitle:'Terms and conditions', termsBody:'Prices are shown in IQD as an approximate conversion. Every order is confirmed by Maya Collection on WhatsApp before it is final.',
  item:'item', items:'items', whatsappUs:'Message us on WhatsApp', callUs:'Call the store',
};

const ku: Record<string, string> = {
  home:'سەرەکی', explore:'گەڕان', wishlist:'دڵخوازەکان', bags:'سەبەتە', about:'دەربارەی ئێمە', collection:'فرۆشگا', ingredients:'کەرەستەی خاو', contact:'پەیوەندی', language:'زمان', menu:'کردنەوەی لیست', closeMenu:'داخستنی لیست', close:'داخستن', back:'گەڕانەوە',
  banner:'گەیاندن بۆ هەموو شار و شارۆچکەکانی کوردستان',
  welcomeTitle1:'واژۆکەی خۆت', welcomeTitle2:'بدۆزەوە', welcomeBody:'بۆنی شاهانە بۆ هەموو هەست و ساتێک.', getStarted:'دەست پێبکە',
  brandTagline:'بۆنی تایبەت بە خۆت بدۆزەوە', newArrivals:'تازەگەیشتووەکان', bannerTitle:'بۆنی نایاب بۆ کەشێکی شاهانە', shopNow:'ئێستا بکڕە',
  categories:'پۆلەکان', women:'ئافرەتان', men:'پیاوان', perfect:'هاوبەش', rawMaterials:'کەرەستەی خاو', ourStore:'فرۆشگاکەمان',
  noProducts:'کۆمەڵەکەمان نوێ دەکرێتەوە. تکایە دواتر سەردانمان بکە.', loading:'کۆمەڵەکەت دەدۆزینەوە', loadError:'نەمانتوانی کۆمەڵەکە نوێ بکەینەوە.', retry:'دووبارە هەوڵبدەوە',
  shop_all:'هەموو بۆنەکان', shop_women:'بۆنی ئافرەتان', shop_men:'بۆنی پیاوان', shop_perfect:'بۆنی هاوبەش',
  search_all:'گەڕان بۆ بۆن...', search_women:'گەڕان لە بۆنی ئافرەتان...', search_men:'گەڕان لە بۆنی پیاوان...', search_perfect:'گەڕان لە بۆنی هاوبەش...',
  filters:'فلتەر', fam_all:'هەموو', fam_floral:'گوڵاوی', fam_woody:'داراوی', fam_fruity:'میوەیی', fam_oriental:'ڕۆژهەڵاتی',
  sort:'ڕیزکردن', sortFeatured:'تایبەت', sortLow:'نرخ: کەم بۆ زۆر', sortHigh:'نرخ: زۆر بۆ کەم', brand:'براند', allBrands:'هەموو براندەکان', category:'پۆل', inStockOnly:'تەنها بەردەستەکان', results:'بۆن', clearFilters:'سڕینەوەی فلتەر', noMatch:'هیچ بۆنێک نەدۆزرایەوە. گەڕانێکی تر تاقی بکەوە.', apply:'پیشاندانی ئەنجام',
  add:'زیادکردن بۆ سەبەتە', added:'زیادکرا بۆ سەبەتەکەت', viewBag:'بینینی سەبەتە', stock:'بەردەستە', soldOut:'ئێستا بەردەست نییە', sku:'کۆد', volume:'قەبارە', quantity:'ژمارە', notes:'تێبینییەکانی بۆن', top:'سەرەتا', heart:'ناوەڕاست', base:'بنەڕەت', ingredientsTitle:'پێکهاتەکان', description:'چیرۆکی ئەم بۆنە',
  currencyNote:'نرخی نزیکەیی بە دینار · ١ دۆلار = ١٬٥٠٠ دینار', exchange:'گۆڕینی نزیکەییە، نرخی ڕاستەوخۆی بازاڕ نییە.',
  yourBag:'سەبەتەکەت', emptyBag:'سەبەتەکەت چاوەڕێی بۆنێکی تایبەتە.', emptyWish:'هێشتا هیچ بۆنێکت پاشەکەوت نەکردووە.', browse:'گەڕان لە کۆمەڵەکە', saved:'بۆنە دڵخوازەکان', remove:'لابردن',
  subtotal:'کۆی لاوەکی', delivery:'گەیاندن', deliveryValue:'لە واتسئاپ دیاری دەکرێت', totalBefore:'کۆ پێش گەیاندن', proceed:'بەردەوامبوون بۆ داواکردن',
  checkoutTitle:'داواکردن', stepDetails:'زانیاری', stepReview:'پێداچوونەوە', stepDone:'نێردرا', name:'ناوی تەواو', phone:'ژمارەی تەلەفۆن', city:'شار', address:'ناونیشانی گەیاندن', notesField:'تێبینی گەیاندن (ئارەزوومەندانە)',
  payment:'شێوازی پارەدان', payWhatsapp:'پارەدان لەگەڵ مایا لە واتسئاپ ڕێکدەخرێت', payNote:'هیچ پارەیەک لەم ماڵپەڕە وەرناگیرێت.', required:'تکایە ئەم خانەیە پڕبکەوە.', invalidPhone:'تکایە ژمارەیەکی دروست بنووسە.',
  reviewOrder:'پێداچوونەوەی داوا', editDetails:'دەستکاری زانیاری', orderSummary:'پوختەی داوا', sendWhatsapp:'ناردنی داوا لە واتسئاپ',
  receiptNote:'داواکارییەکەت لە واتسئاپ دەکرێتەوە بۆ پێداچوونەوە و ناردن.',
  confirmTitle:'داواکارییەکەت لە واتسئاپ ئامادەیە', confirmBody:'نامە ئامادەکراوەکە لە واتسئاپ بنێرە. داواکارییەکەت دوای وەڵامی کۆڵێکشنی مایا پشتڕاست دەبێتەوە. هیچ پارەیەک وەرنەگیراوە.', reopen:'دووبارە کردنەوەی واتسئاپ', clearBag:'بەتاڵکردنی سەبەتە و بەردەوامبوون',
  order:'داواکاری کۆڵێکشنی مایا', size:'قەبارە', total:'کۆی گشتی', customer:'کڕیار', deliveryAddr:'ناونیشانی گەیاندن',
  pages:'پەڕەکان', support:'یارمەتی کڕیار', faq:'پرسیارە باوەکان', shipping:'زانیاری گەیاندن', returns:'گەڕاندنەوە و پارە', contactSupport:'پەیوەندی بە یارمەتی', privacy:'سیاسەتی تایبەتمەندی', terms:'مەرج و ڕێساکان',
  contactInfo:'پەیوەندی', storeName:'Maya collection perfumes', map:'شوێنمان لە نەخشە', followUs:'شوێنمان بکەوە لە', rights:'© MAYA COLLECTION. هەموو مافەکان پارێزراون.', admin:'بەڕێوەبەر',
  aboutTitle:'بۆن، بە شێوازی کەسی.', aboutBody:'کۆڵێکشنی مایا لە سلێمانی لەسەر بیرۆکەیەکی سادە دامەزراوە: بۆنی دروست وەک ئەوەیە هەمیشە هی تۆ بووبێت.',
  rawTitle:'تێبینییەکانی پشت هەستەکە.', rawBody:'لە یەکەم بۆنی ڕوونەوە تا گەرمییەکەی کە دەمێنێتەوە، هەر بۆنێک پێکهاتەیەکی بچووکە لەگەڵ چیرۆکێک.',
  contactTitle:'با بۆنەکەت بدۆزینەوە.', contactBody:'پێمان بڵێ چیت خۆشدەوێت و تیمەکەمان لە سلێمانی یارمەتیت دەدات.',
  faqTitle:'چۆن داوا بکەیت', faqBody:'بۆن زیاد بکە بۆ سەبەتە، زانیارییەکانت پڕبکەوە و نامە ئامادەکراوەکە لە واتسئاپ بنێرە. تیمەکەمان وەڵام دەداتەوە بۆ پشتڕاستکردنەوەی بەردەستبوون، گەیاندن و پارەدان.',
  shippingTitle:'گەیاندن بۆ سەرانسەری کوردستان', shippingBody:'بۆ هەموو شار و شارۆچکەکانی کوردستان دەگەیەنین. نرخ و کاتی گەیاندن لە واتسئاپ پێش کۆتاییهاتنی داواکە دیاری دەکرێت.',
  returnsTitle:'گەڕاندنەوە و پارە', returnsBody:'بۆ هەر پرسیارێک دەربارەی داوا، گۆڕین یان گەڕاندنەوەی پارە، لە واتسئاپ یان بە تەلەفۆن پەیوەندیمان پێوە بکە.',
  privacyTitle:'تایبەتمەندیت', privacyBody:'سەبەتە، دڵخوازەکان و زمانەکەت تەنها لەم وێبگەڕەدا پاشەکەوت دەکرێن. زانیاری داوا تەنها کاتێک دەنێردرێت کە خۆت لە واتسئاپ بینێریت.',
  termsTitle:'مەرج و ڕێساکان', termsBody:'نرخەکان بە دیناری عێراقی وەک گۆڕینێکی نزیکەیی پیشان دەدرێن. هەموو داوایەک لە واتسئاپ لەلایەن کۆڵێکشنی مایا پشتڕاست دەکرێتەوە.',
  item:'دانە', items:'دانە', whatsappUs:'نامە بنێرە لە واتسئاپ', callUs:'پەیوەندی بە فرۆشگا',
};

const ar: Record<string, string> = {
  home:'الرئيسية', explore:'استكشف', wishlist:'المفضلة', bags:'الحقيبة', about:'من نحن', collection:'المتجر', ingredients:'المواد الخام', contact:'اتصل بنا', language:'اللغة', menu:'فتح القائمة', closeMenu:'إغلاق القائمة', close:'إغلاق', back:'رجوع',
  banner:'نوصل إلى جميع مدن وبلدات كردستان',
  welcomeTitle1:'اكتشف', welcomeTitle2:'توقيعك العطري', welcomeBody:'عطور فاخرة لكل مزاج ولكل لحظة.', getStarted:'ابدأ الآن',
  brandTagline:'اكتشف عطرك المميز من مجموعتنا', newArrivals:'وصل حديثاً', bannerTitle:'عطور رائعة لهالة ملكية', shopNow:'تسوق الآن',
  categories:'الفئات', women:'نساء', men:'رجال', perfect:'مشترك', rawMaterials:'المواد الخام', ourStore:'متجرنا',
  noProducts:'نعمل على تحديث مجموعتنا. يرجى زيارتنا قريباً.', loading:'نجهز مجموعتك', loadError:'تعذر تحديث المجموعة.', retry:'حاول مجدداً',
  shop_all:'جميع العطور', shop_women:'عطور نسائية', shop_men:'عطور رجالية', shop_perfect:'عطور مشتركة',
  search_all:'ابحث عن العطور...', search_women:'ابحث في العطور النسائية...', search_men:'ابحث في العطور الرجالية...', search_perfect:'ابحث في العطور المشتركة...',
  filters:'الفلاتر', fam_all:'الكل', fam_floral:'زهري', fam_woody:'خشبي', fam_fruity:'فاكهي', fam_oriental:'شرقي',
  sort:'الترتيب', sortFeatured:'مميز', sortLow:'السعر: من الأقل', sortHigh:'السعر: من الأعلى', brand:'العلامة', allBrands:'كل العلامات', category:'الفئة', inStockOnly:'المتوفر فقط', results:'عطر', clearFilters:'مسح الفلاتر', noMatch:'لا يوجد عطر مطابق. جرّب بحثاً أو فلتراً آخر.', apply:'عرض النتائج',
  add:'أضف إلى الحقيبة', added:'أُضيف إلى حقيبتك', viewBag:'عرض الحقيبة', stock:'متوفر', soldOut:'غير متوفر حالياً', sku:'الرمز', volume:'الحجم', quantity:'الكمية', notes:'نوتات العطر', top:'المقدمة', heart:'القلب', base:'القاعدة', ingredientsTitle:'المكونات', description:'حكاية هذا العطر',
  currencyNote:'سعر تقريبي بالدينار · 1 دولار = 1,500 دينار', exchange:'تحويل تقريبي وليس سعر صرف مباشر.',
  yourBag:'حقيبتك', emptyBag:'حقيبتك بانتظار عطر يشبهك.', emptyWish:'قائمة المفضلة فارغة حالياً.', browse:'تصفح المجموعة', saved:'العطور المفضلة', remove:'إزالة',
  subtotal:'المجموع الفرعي', delivery:'التوصيل', deliveryValue:'يُحدد عبر واتساب', totalBefore:'الإجمالي قبل التوصيل', proceed:'متابعة الطلب',
  checkoutTitle:'إتمام الطلب', stepDetails:'البيانات', stepReview:'المراجعة', stepDone:'أُرسل', name:'الاسم الكامل', phone:'رقم الهاتف', city:'المدينة', address:'عنوان التوصيل', notesField:'ملاحظات التوصيل (اختياري)',
  payment:'طريقة الدفع', payWhatsapp:'ترتيب الدفع مع مايا عبر واتساب', payNote:'لا يتم أي دفع إلكتروني على هذا الموقع.', required:'يرجى ملء هذا الحقل.', invalidPhone:'يرجى إدخال رقم هاتف صحيح.',
  reviewOrder:'مراجعة الطلب', editDetails:'تعديل البيانات', orderSummary:'ملخص الطلب', sendWhatsapp:'إرسال الطلب عبر واتساب',
  receiptNote:'سيُفتح طلبك المفصل في واتساب لتراجعه وترسله بنفسك.',
  confirmTitle:'طلبك جاهز في واتساب', confirmBody:'أرسل الرسالة المجهزة في واتساب. يتم تأكيد طلبك عند رد مايا كوليكشن. لم يتم أخذ أي دفعة.', reopen:'فتح واتساب مجدداً', clearBag:'إفراغ الحقيبة والمتابعة',
  order:'طلب مايا كوليكشن', size:'الحجم', total:'الإجمالي', customer:'العميل', deliveryAddr:'عنوان التوصيل',
  pages:'الصفحات', support:'خدمة العملاء', faq:'الأسئلة الشائعة', shipping:'معلومات الشحن', returns:'الإرجاع والاسترداد', contactSupport:'تواصل مع الدعم', privacy:'سياسة الخصوصية', terms:'الشروط والأحكام',
  contactInfo:'التواصل', storeName:'Maya collection perfumes', map:'موقعنا على الخريطة', followUs:'تابعنا على', rights:'© MAYA COLLECTION. جميع الحقوق محفوظة.', admin:'الإدارة',
  aboutTitle:'العطر، بأسلوب شخصي.', aboutBody:'مايا كوليكشن دار عطور من السليمانية، تنطلق من فكرة بسيطة: يجب أن تشعر أن عطرك المناسب كان دائماً جزءاً منك.',
  rawTitle:'نوتات تصنع الإحساس.', rawBody:'من الانطباع الأول المشرق إلى الدفء الذي يبقى قريباً، كل عطر تركيبة صغيرة تحمل حكاية.',
  contactTitle:'لنجد عطرك معاً.', contactBody:'أخبرنا بما تحب وسيساعدك فريقنا في السليمانية على الاختيار.',
  faqTitle:'كيف يتم الطلب', faqBody:'أضف العطور إلى حقيبتك، واملأ بياناتك، وأرسل الرسالة المجهزة عبر واتساب. يرد فريقنا لتأكيد التوفر والتوصيل والدفع.',
  shippingTitle:'التوصيل في كل كردستان', shippingBody:'نوصل إلى جميع مدن وبلدات كردستان. تُحدد تكلفة التوصيل وموعده معك عبر واتساب قبل تأكيد الطلب.',
  returnsTitle:'الإرجاع والاسترداد', returnsBody:'لأي سؤال حول طلب أو استبدال أو استرداد، تواصل مع فريقنا عبر واتساب أو اتصل بالمتجر.',
  privacyTitle:'خصوصيتك', privacyBody:'تُحفظ حقيبتك ومفضلتك ولغتك في هذا المتصفح فقط. لا تُشارك بيانات الطلب إلا عندما ترسلها إلينا بنفسك عبر واتساب.',
  termsTitle:'الشروط والأحكام', termsBody:'تُعرض الأسعار بالدينار العراقي كتحويل تقريبي. يُؤكد كل طلب من مايا كوليكشن عبر واتساب قبل اعتماده.',
  item:'قطعة', items:'قطع', whatsappUs:'راسلنا على واتساب', callUs:'اتصل بالمتجر',
};

export const copy: Record<Language, Record<string, string>> = { en, ku, ar };
