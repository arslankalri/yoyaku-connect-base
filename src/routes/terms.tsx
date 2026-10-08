import { createFileRoute } from "@tanstack/react-router";

import { OPERATOR, PublicPage, Sections, type Section } from "@/components/public-page";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service / 利用規約 — NAGI AI" },
      { name: "description", content: "Terms governing use of the NAGI AI receptionist service for businesses." },
      { property: "og:title", content: "Terms of Service — NAGI AI" },
      { property: "og:description", content: "Terms for using NAGI AI's AI reception and booking service." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

const en: Section[] = [
  { h: "1. Acceptance", p: ["By creating an account or using NAGI AI (the \"Service\"), you (the \"Subscriber\") agree to these Terms. If you do not agree, do not use the Service."] },
  { h: "2. The Service", p: ["NAGI AI provides an AI receptionist that answers customer inquiries by chat and voice, and manages appointments using business information supplied by the Subscriber.", "Voice audio and speech processing are provided through third-party providers (such as Vapi). Availability may be affected by those providers."] },
  { h: "3. Account responsibilities", p: ["You must provide accurate information, keep your login credentials secure, and are responsible for all activity under your account.", "You are responsible for the accuracy of your business hours, services, prices, staff and FAQs. NAGI answers based on this information."] },
  { h: "4. AI limitations", p: ["AI responses may occasionally be inaccurate, misheard or incomplete. The Subscriber should review bookings and notifications, and NAGI AI is not liable for losses caused by AI errors, missed calls or double bookings.", "The Service must not be used for emergency, medical diagnosis, legal or other high-risk advice."] },
  { h: "5. Customer notice and consent", p: ["The Subscriber is responsible for informing its customers that they are speaking with an AI and that calls may be transcribed or recorded, and for obtaining any consent required by applicable law."] },
  { h: "6. Prohibited use", p: ["You may not use the Service for unlawful, fraudulent, harassing or spam activity, attempt to access other businesses' data, or reverse engineer or overload the Service."] },
  { h: "7. Fees", p: ["The Service is currently offered free of charge during testing. If paid plans are introduced, pricing and terms will be shown before you are charged."] },
  { h: "8. Suspension and termination", p: ["You may stop using the Service at any time. We may suspend accounts that violate these Terms. On request, account data will be deleted as described in the Privacy Policy."] },
  { h: "9. Limitation of liability", p: ["To the extent permitted by law, the Service is provided \"as is\", and our total liability is limited to the amount paid by you for the Service in the preceding three months."] },
  { h: "10. Changes", p: ["We may update these Terms. Material changes will be announced on the site; continued use means acceptance."] },
  { h: "11. Governing law", p: ["These Terms are governed by the laws of Japan. The Sendai District Court has exclusive jurisdiction of first instance."] },
  { h: "12. Contact", p: [`${OPERATOR.name} — ${OPERATOR.email} — ${OPERATOR.phone}`] },
];

const ja: Section[] = [
  { h: "第1条（同意）", p: ["本サービス「NAGI AI」（以下「本サービス」）のアカウント作成または利用により、利用者は本規約に同意したものとみなされます。"] },
  { h: "第2条（サービス内容）", p: ["本サービスは、利用者が登録した事業情報に基づき、チャットおよび音声で顧客対応と予約管理を行うAI受付サービスです。", "音声通話および音声処理は第三者サービス（Vapi等）を通じて提供され、その稼働状況の影響を受ける場合があります。"] },
  { h: "第3条（利用者の責任）", p: ["利用者は正確な情報を登録し、ログイン情報を適切に管理するものとします。", "営業時間・メニュー・料金・スタッフ・FAQ等の内容の正確性は利用者が責任を負います。"] },
  { h: "第4条（AIの限界）", p: ["AIの応答には誤り、聞き間違い、不完全な内容が含まれる場合があります。利用者は予約内容と通知を確認するものとし、AIの誤り・不在着信・重複予約等による損害について当方は責任を負いません。", "緊急対応、医療診断、法律相談等の用途には利用できません。"] },
  { h: "第5条（顧客への告知と同意）", p: ["利用者は、顧客に対しAIが対応していること、および通話が文字起こし・録音される場合があることを告知し、法令上必要な同意を取得する責任を負います。"] },
  { h: "第6条（禁止事項）", p: ["違法行為、詐欺、迷惑行為、他事業者データへの不正アクセス、リバースエンジニアリング、過度な負荷をかける行為を禁止します。"] },
  { h: "第7条（料金）", p: ["現在、本サービスはテスト期間として無料で提供しています。有料プランを導入する場合は、課金前に料金と条件を表示します。"] },
  { h: "第8条（停止・解約）", p: ["利用者はいつでも利用を停止できます。規約違反がある場合、当方はアカウントを停止できるものとします。データ削除はプライバシーポリシーに従います。"] },
  { h: "第9条（責任の制限）", p: ["法令で認められる範囲で、本サービスは現状有姿で提供され、当方の責任は直近3か月に利用者が支払った金額を上限とします。"] },
  { h: "第10条（規約の変更）", p: ["本規約は変更される場合があります。重要な変更はサイト上で告知し、その後の利用をもって同意したものとみなします。"] },
  { h: "第11条（準拠法・管轄）", p: ["本規約は日本法に準拠し、仙台地方裁判所を第一審の専属的合意管轄裁判所とします。"] },
  { h: "第12条（お問い合わせ）", p: [`${OPERATOR.name} — ${OPERATOR.email} — ${OPERATOR.phone}`] },
];

function TermsPage() {
  const { language } = useI18n();
  const isJa = language === "ja";
  return (
    <PublicPage title={isJa ? "利用規約" : "Terms of Service"} updated={isJa ? "最終更新日：2026年10月8日" : "Last updated: October 8, 2026"}>
      <Sections items={isJa ? ja : en} />
    </PublicPage>
  );
}
