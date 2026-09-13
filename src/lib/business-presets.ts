import { useI18n } from "@/lib/i18n";

export type BusinessType =
  | "hair_salon"
  | "barber"
  | "beauty_salon"
  | "massage_spa"
  | "clinic"
  | "dental"
  | "restaurant"
  | "cafe"
  | "bar_izakaya"
  | "studio"
  | "pet_care"
  | "repair_service"
  | "lessons"
  | "other";

export type BusinessTypeOption = {
  key: BusinessType;
  label: { ja: string; en: string };
  icon: string;
};

export const BUSINESS_TYPES: BusinessTypeOption[] = [
  { key: "hair_salon", label: { ja: "美容室・ヘアサロン", en: "Hair salon" }, icon: "✂️" },
  { key: "barber", label: { ja: "理容室・バーバー", en: "Barbershop" }, icon: "💈" },
  {
    key: "beauty_salon",
    label: { ja: "エステ・ネイルサロン", en: "Beauty / nail salon" },
    icon: "💅",
  },
  { key: "massage_spa", label: { ja: "マッサージ・整体・スパ", en: "Massage / spa" }, icon: "🧘" },
  { key: "clinic", label: { ja: "クリニック・整骨院", en: "Clinic" }, icon: "🏥" },
  { key: "dental", label: { ja: "歯科医院", en: "Dental clinic" }, icon: "🦷" },
  { key: "restaurant", label: { ja: "レストラン・飲食店", en: "Restaurant" }, icon: "🍽️" },
  { key: "cafe", label: { ja: "カフェ・ベーカリー", en: "Cafe / bakery" }, icon: "☕" },
  { key: "bar_izakaya", label: { ja: "居酒屋・バー", en: "Bar / izakaya" }, icon: "🍶" },
  { key: "studio", label: { ja: "ヨガ・フィットネススタジオ", en: "Fitness studio" }, icon: "🧘‍♀️" },
  { key: "pet_care", label: { ja: "ペットサロン・動物病院", en: "Pet care" }, icon: "🐾" },
  {
    key: "repair_service",
    label: { ja: "修理・整備・出張サービス", en: "Repair / home service" },
    icon: "🔧",
  },
  { key: "lessons", label: { ja: "教室・スクール", en: "Lessons / school" }, icon: "🎓" },
  { key: "other", label: { ja: "その他", en: "Other" }, icon: "🏢" },
];

export type PresetService = {
  name: { ja: string; en: string };
  duration_minutes: number;
  price: number;
  is_active: true;
};

export type PresetHour = {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
};

function week(
  open: string,
  close: string,
  closedDays: number[] = [0],
  overrides: Partial<Record<number, { open: string; close: string }>> = {},
): PresetHour[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const o = overrides[day];
    return {
      day_of_week: day,
      is_open: !closedDays.includes(day),
      open_time: o?.open ?? open,
      close_time: o?.close ?? close,
    };
  });
}

const DEFAULT_HOURS = week("09:00", "18:00");
const SALON_HOURS = week("10:00", "19:00", [0], { 6: { open: "10:00", close: "18:00" } });
const CLINIC_HOURS = week("09:00", "18:00", [0, 6]);
const RESTAURANT_HOURS = week("11:00", "22:00", [1]);
const CAFE_HOURS = week("08:00", "19:00", []);
const BAR_HOURS = week("17:00", "23:30", [0]);

const PRESETS: Record<BusinessType, { services: PresetService[]; hours: PresetHour[] }> = {
  hair_salon: {
    services: [
      { name: { ja: "カット", en: "Cut" }, duration_minutes: 60, price: 5500, is_active: true },
      { name: { ja: "カラー", en: "Colour" }, duration_minutes: 90, price: 8800, is_active: true },
      {
        name: { ja: "カット＋カラー", en: "Cut + Colour" },
        duration_minutes: 120,
        price: 12100,
        is_active: true,
      },
      { name: { ja: "パーマ", en: "Perm" }, duration_minutes: 120, price: 11000, is_active: true },
      {
        name: { ja: "トリートメント", en: "Treatment" },
        duration_minutes: 30,
        price: 3300,
        is_active: true,
      },
    ],
    hours: SALON_HOURS,
  },
  barber: {
    services: [
      { name: { ja: "カット", en: "Haircut" }, duration_minutes: 45, price: 3800, is_active: true },
      {
        name: { ja: "カット＋シェービング", en: "Cut + shave" },
        duration_minutes: 60,
        price: 5200,
        is_active: true,
      },
      {
        name: { ja: "ヒゲ整え", en: "Beard trim" },
        duration_minutes: 30,
        price: 2200,
        is_active: true,
      },
      {
        name: { ja: "お子様カット", en: "Kids cut" },
        duration_minutes: 30,
        price: 2500,
        is_active: true,
      },
    ],
    hours: week("09:00", "19:00", [1]),
  },
  beauty_salon: {
    services: [
      {
        name: { ja: "フェイシャルエステ", en: "Facial" },
        duration_minutes: 60,
        price: 11000,
        is_active: true,
      },
      {
        name: { ja: "ボディエステ", en: "Body treatment" },
        duration_minutes: 90,
        price: 16500,
        is_active: true,
      },
      { name: { ja: "ネイル", en: "Nails" }, duration_minutes: 90, price: 7700, is_active: true },
      {
        name: { ja: "まつ毛エクステ", en: "Lash extensions" },
        duration_minutes: 90,
        price: 6600,
        is_active: true,
      },
    ],
    hours: SALON_HOURS,
  },
  clinic: {
    services: [
      {
        name: { ja: "一般診療", en: "General consultation" },
        duration_minutes: 30,
        price: 0,
        is_active: true,
      },
      {
        name: { ja: "健康診断", en: "Health check" },
        duration_minutes: 60,
        price: 5500,
        is_active: true,
      },
      {
        name: { ja: "予防接種", en: "Vaccination" },
        duration_minutes: 30,
        price: 3300,
        is_active: true,
      },
    ],
    hours: CLINIC_HOURS,
  },
  dental: {
    services: [
      {
        name: { ja: "初診カウンセリング", en: "First consultation" },
        duration_minutes: 30,
        price: 0,
        is_active: true,
      },
      {
        name: { ja: "クリーニング", en: "Cleaning" },
        duration_minutes: 60,
        price: 8800,
        is_active: true,
      },
      {
        name: { ja: "虫歯治療", en: "Cavity treatment" },
        duration_minutes: 60,
        price: 7700,
        is_active: true,
      },
      {
        name: { ja: "ホワイトニング", en: "Whitening" },
        duration_minutes: 60,
        price: 16500,
        is_active: true,
      },
    ],
    hours: CLINIC_HOURS,
  },
  massage_spa: {
    services: [
      {
        name: { ja: "ボディマッサージ60分", en: "Body massage 60 min" },
        duration_minutes: 60,
        price: 8800,
        is_active: true,
      },
      {
        name: { ja: "ボディマッサージ90分", en: "Body massage 90 min" },
        duration_minutes: 90,
        price: 13200,
        is_active: true,
      },
      {
        name: { ja: "足つぼマッサージ", en: "Foot massage" },
        duration_minutes: 60,
        price: 6600,
        is_active: true,
      },
      {
        name: { ja: "オイルトリートメント", en: "Oil treatment" },
        duration_minutes: 90,
        price: 12100,
        is_active: true,
      },
    ],
    hours: week("10:00", "21:00", [], {
      0: { open: "10:00", close: "20:00" },
      6: { open: "10:00", close: "20:00" },
    }),
  },
  restaurant: {
    services: [
      {
        name: { ja: "ランチ予約（2名）", en: "Lunch table (2 people)" },
        duration_minutes: 60,
        price: 0,
        is_active: true,
      },
      {
        name: { ja: "ディナー予約（2名）", en: "Dinner table (2 people)" },
        duration_minutes: 90,
        price: 0,
        is_active: true,
      },
      {
        name: { ja: "ディナー予約（4名）", en: "Dinner table (4 people)" },
        duration_minutes: 120,
        price: 0,
        is_active: true,
      },
      {
        name: { ja: "コースディナー", en: "Course dinner" },
        duration_minutes: 120,
        price: 5500,
        is_active: true,
      },
      {
        name: { ja: "個室・宴会", en: "Private room / party" },
        duration_minutes: 180,
        price: 0,
        is_active: true,
      },
    ],
    hours: RESTAURANT_HOURS,
  },
  cafe: {
    services: [
      {
        name: { ja: "席の予約（2名）", en: "Table for 2" },
        duration_minutes: 60,
        price: 0,
        is_active: true,
      },
      {
        name: { ja: "席の予約（4名）", en: "Table for 4" },
        duration_minutes: 90,
        price: 0,
        is_active: true,
      },
      {
        name: { ja: "ケーキ・ご予約商品の受取", en: "Cake / order pickup" },
        duration_minutes: 15,
        price: 0,
        is_active: true,
      },
    ],
    hours: CAFE_HOURS,
  },
  bar_izakaya: {
    services: [
      {
        name: { ja: "カウンター席（2名）", en: "Counter seats (2)" },
        duration_minutes: 120,
        price: 0,
        is_active: true,
      },
      {
        name: { ja: "テーブル席（4名）", en: "Table (4 people)" },
        duration_minutes: 120,
        price: 0,
        is_active: true,
      },
      {
        name: { ja: "飲み放題コース", en: "All-you-can-drink course" },
        duration_minutes: 120,
        price: 4000,
        is_active: true,
      },
    ],
    hours: BAR_HOURS,
  },
  studio: {
    services: [
      {
        name: { ja: "ヨガレッスン", en: "Yoga class" },
        duration_minutes: 60,
        price: 3300,
        is_active: true,
      },
      {
        name: { ja: "ピラティス", en: "Pilates" },
        duration_minutes: 60,
        price: 4400,
        is_active: true,
      },
      {
        name: { ja: "パーソナルトレーニング", en: "Personal training" },
        duration_minutes: 60,
        price: 11000,
        is_active: true,
      },
    ],
    hours: week("07:00", "22:00", [], {
      0: { open: "08:00", close: "20:00" },
      6: { open: "08:00", close: "18:00" },
    }),
  },
  pet_care: {
    services: [
      {
        name: { ja: "シャンプーコース", en: "Bath & shampoo" },
        duration_minutes: 60,
        price: 5500,
        is_active: true,
      },
      {
        name: { ja: "トリミング", en: "Full grooming" },
        duration_minutes: 120,
        price: 9900,
        is_active: true,
      },
      {
        name: { ja: "爪切り・耳掃除", en: "Nails & ears" },
        duration_minutes: 30,
        price: 2200,
        is_active: true,
      },
      {
        name: { ja: "健康チェック", en: "Health check" },
        duration_minutes: 30,
        price: 3300,
        is_active: true,
      },
    ],
    hours: week("09:00", "18:00", [3]),
  },
  repair_service: {
    services: [
      {
        name: { ja: "点検・見積り", en: "Inspection / quote" },
        duration_minutes: 30,
        price: 0,
        is_active: true,
      },
      {
        name: { ja: "標準修理", en: "Standard repair" },
        duration_minutes: 90,
        price: 8800,
        is_active: true,
      },
      {
        name: { ja: "出張対応", en: "On-site visit" },
        duration_minutes: 120,
        price: 13200,
        is_active: true,
      },
    ],
    hours: week("09:00", "18:00", [0]),
  },
  lessons: {
    services: [
      {
        name: { ja: "体験レッスン", en: "Trial lesson" },
        duration_minutes: 45,
        price: 0,
        is_active: true,
      },
      {
        name: { ja: "個人レッスン", en: "Private lesson" },
        duration_minutes: 60,
        price: 5500,
        is_active: true,
      },
      {
        name: { ja: "グループレッスン", en: "Group lesson" },
        duration_minutes: 60,
        price: 3300,
        is_active: true,
      },
    ],
    hours: week("10:00", "21:00", [0]),
  },
  other: {
    services: [
      {
        name: { ja: "ご相談・ご予約", en: "Appointment" },
        duration_minutes: 60,
        price: 0,
        is_active: true,
      },
    ],
    hours: DEFAULT_HOURS,
  },
};

export function presetServices(type: BusinessType): PresetService[] {
  return PRESETS[type]?.services ?? PRESETS.other.services;
}

export function presetHours(type: BusinessType): PresetHour[] {
  return PRESETS[type]?.hours ?? DEFAULT_HOURS;
}

/** Businesses that book seats/tables rather than staff-delivered services. */
const SEATING_TYPES: BusinessType[] = ["restaurant", "cafe", "bar_izakaya"];

export function isSeatingBusiness(type: BusinessType | null | undefined) {
  return !!type && SEATING_TYPES.includes(type);
}

export function useBusinessTypeLabel(key: BusinessType | undefined) {
  const { language } = useI18n();
  if (!key) return "";
  return BUSINESS_TYPES.find((t) => t.key === key)?.label[language] ?? key;
}
