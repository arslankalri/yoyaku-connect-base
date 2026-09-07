import { useI18n } from "@/lib/i18n";

export type BusinessType =
  "hair_salon" | "beauty_salon" | "clinic" | "dental" | "massage_spa" | "studio" | "other";

export type BusinessTypeOption = {
  key: BusinessType;
  label: { ja: string; en: string };
  icon: string;
};

export const BUSINESS_TYPES: BusinessTypeOption[] = [
  { key: "hair_salon", label: { ja: "美容室・ヘアサロン", en: "Hair salon" }, icon: "✂️" },
  { key: "beauty_salon", label: { ja: "エステ・ネイルサロン", en: "Beauty salon" }, icon: "💅" },
  { key: "clinic", label: { ja: "クリニック", en: "Clinic" }, icon: "🏥" },
  { key: "dental", label: { ja: "歯科医院", en: "Dental clinic" }, icon: "🦷" },
  { key: "massage_spa", label: { ja: "マッサージ・スパ", en: "Massage / spa" }, icon: "🧘" },
  { key: "studio", label: { ja: "ヨガ・フィットネススタジオ", en: "Studio" }, icon: "🧘‍♀️" },
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

const DEFAULT_HOURS: PresetHour[] = [
  { day_of_week: 0, is_open: false, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 1, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 2, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 3, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 4, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 5, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 6, is_open: true, open_time: "09:00", close_time: "18:00" },
];

const SALON_HOURS: PresetHour[] = [
  { day_of_week: 0, is_open: false, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 1, is_open: true, open_time: "10:00", close_time: "19:00" },
  { day_of_week: 2, is_open: true, open_time: "10:00", close_time: "19:00" },
  { day_of_week: 3, is_open: true, open_time: "10:00", close_time: "19:00" },
  { day_of_week: 4, is_open: true, open_time: "10:00", close_time: "19:00" },
  { day_of_week: 5, is_open: true, open_time: "10:00", close_time: "19:00" },
  { day_of_week: 6, is_open: true, open_time: "10:00", close_time: "18:00" },
];

const CLINIC_HOURS: PresetHour[] = [
  { day_of_week: 0, is_open: false, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 1, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 2, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 3, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 4, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 5, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 6, is_open: false, open_time: "09:00", close_time: "18:00" },
];

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
    hours: [
      { day_of_week: 0, is_open: true, open_time: "10:00", close_time: "20:00" },
      { day_of_week: 1, is_open: true, open_time: "10:00", close_time: "21:00" },
      { day_of_week: 2, is_open: true, open_time: "10:00", close_time: "21:00" },
      { day_of_week: 3, is_open: true, open_time: "10:00", close_time: "21:00" },
      { day_of_week: 4, is_open: true, open_time: "10:00", close_time: "21:00" },
      { day_of_week: 5, is_open: true, open_time: "10:00", close_time: "21:00" },
      { day_of_week: 6, is_open: true, open_time: "10:00", close_time: "20:00" },
    ],
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
    hours: [
      { day_of_week: 0, is_open: true, open_time: "08:00", close_time: "20:00" },
      { day_of_week: 1, is_open: true, open_time: "07:00", close_time: "22:00" },
      { day_of_week: 2, is_open: true, open_time: "07:00", close_time: "22:00" },
      { day_of_week: 3, is_open: true, open_time: "07:00", close_time: "22:00" },
      { day_of_week: 4, is_open: true, open_time: "07:00", close_time: "22:00" },
      { day_of_week: 5, is_open: true, open_time: "07:00", close_time: "22:00" },
      { day_of_week: 6, is_open: true, open_time: "08:00", close_time: "18:00" },
    ],
  },
  other: {
    services: [
      {
        name: { ja: "標準サービス", en: "Standard service" },
        duration_minutes: 60,
        price: 5000,
        is_active: true,
      },
    ],
    hours: DEFAULT_HOURS,
  },
};

export function presetServices(type: BusinessType): PresetService[] {
  return PRESETS[type]?.services ?? [];
}

export function presetHours(type: BusinessType): PresetHour[] {
  return PRESETS[type]?.hours ?? DEFAULT_HOURS;
}

export function useBusinessTypeLabel(key: BusinessType | undefined) {
  const { language } = useI18n();
  if (!key) return "";
  return BUSINESS_TYPES.find((t) => t.key === key)?.label[language] ?? key;
}
