import { createFileRoute } from "@tanstack/react-router";

import { OPERATOR, PublicPage, Sections, type Section } from "@/components/public-page";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy / プライバシーポリシー — NAGI AI" },
      { name: "description", content: "How NAGI AI collects, uses and protects business and caller data, including call transcripts and recordings." },
      { property: "og:title", content: "Privacy Policy — NAGI AI" },
      { property: "og:description", content: "How NAGI AI handles business, booking and call data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const en: Section[] = [
  { h: "1. Operator", p: [`NAGI AI is operated by ${OPERATOR.name}, ${OPERATOR.locationEn}. Contact: ${OPERATOR.email}.`] },
  { h: "2. Information we collect", p: ["Business owners: name, email, password (stored hashed), business profile, hours, services, staff, FAQs and settings.", "Customers of businesses: name, phone number, email (if provided), party size, appointment details, chat messages, call transcripts, call summaries and, where enabled, call recordings.", "Technical data: log information needed to operate and secure the Service."] },
  { h: "3. How we use it", p: ["To answer inquiries, check availability, create and manage bookings, notify business owners, verify identity before changing a reservation, and to maintain and improve the Service.", "We do not sell personal information or use it for third-party advertising."] },
  { h: "4. Roles", p: ["For customer data, the business using NAGI AI decides how it is used; NAGI AI processes it on the business's behalf. Each business's data is kept separate and is accessible only to that business's account."] },
  { h: "5. Service providers", p: ["We share data only as needed with providers that operate the Service: cloud hosting and database (Lovable Cloud), voice calling and speech processing (Vapi and its speech/voice partners), AI language models (via the Lovable AI Gateway), and Google Calendar when a business connects it. Some providers may process data outside Japan."] },
  { h: "6. Retention and deletion", p: ["Data is kept while the business account is active. Business owners may delete bookings and records, and may request account deletion by contacting us; data will then be deleted within a reasonable period unless retention is required by law."] },
  { h: "7. Security", p: ["We use encrypted connections, access controls that separate each business's data, and encrypted storage of connection credentials. No system is perfectly secure."] },
  { h: "8. Your rights", p: ["Under Japan's Act on the Protection of Personal Information, you may request disclosure, correction, suspension of use or deletion of your personal information. Customers of a business should first contact that business; you may also contact us."] },
  { h: "9. Changes", p: ["We may update this policy and will post the latest version on this page."] },
];

const ja: Section[] = [
  { h: "1. 事業者", p: [`NAGI AIは${OPERATOR.locationJa}の${OPERATOR.name}が運営しています。連絡先：${OPERATOR.email}`] },
  { h: "2. 取得する情報", p: ["事業者：氏名、メールアドレス、パスワード（ハッシュ化して保存）、店舗情報、営業時間、メニュー、スタッフ、FAQ、設定。", "事業者の顧客：氏名、電話番号、メールアドレス（任意）、人数、予約内容、チャット内容、通話の文字起こし・要約、および有効な場合は通話録音。", "技術情報：サービスの運用と安全確保に必要なログ情報。"] },
  { h: "3. 利用目的", p: ["問い合わせ対応、空き状況の確認、予約の作成・管理、事業者への通知、予約変更時の本人確認、サービスの維持・改善のために利用します。", "個人情報の販売や第三者広告への利用は行いません。"] },
  { h: "4. 役割", p: ["顧客データの利用目的は本サービスを利用する事業者が決定し、NAGI AIは事業者に代わって処理します。各事業者のデータは分離され、その事業者のアカウントのみがアクセスできます。"] },
  { h: "5. 委託先", p: ["サービス運営に必要な範囲で、クラウド基盤・データベース（Lovable Cloud）、音声通話・音声処理（Vapiおよびその提携先）、AI言語モデル（Lovable AI Gateway経由）、事業者が接続した場合のGoogleカレンダーに情報を提供します。一部の委託先は日本国外でデータを処理する場合があります。"] },
  { h: "6. 保存期間と削除", p: ["事業者アカウントが有効な間保存します。事業者は予約や記録を削除でき、アカウント削除をご依頼いただいた場合、法令上の保存義務がない限り合理的な期間内に削除します。"] },
  { h: "7. 安全管理", p: ["通信の暗号化、事業者ごとのアクセス制御、接続情報の暗号化保存などの対策を講じています。ただし完全な安全を保証するものではありません。"] },
  { h: "8. 開示等の請求", p: ["個人情報保護法に基づき、開示・訂正・利用停止・削除を請求できます。事業者の顧客の方は、まず当該事業者へご連絡ください。当方へのご連絡も可能です。"] },
  { h: "9. 改定", p: ["本ポリシーは改定される場合があり、最新版を本ページに掲載します。"] },
];

function PrivacyPage() {
  const { language } = useI18n();
  const isJa = language === "ja";
  return (
    <PublicPage title={isJa ? "プライバシーポリシー" : "Privacy Policy"} updated={isJa ? "最終更新日：2026年10月8日" : "Last updated: October 8, 2026"}>
      <Sections items={isJa ? ja : en} />
    </PublicPage>
  );
}
