import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="prose-sm space-y-4">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: 2026-07-30</p>

      <p>
        DentBrand AI (&quot;we&quot;, &quot;us&quot;) helps businesses create
        branded social media designs. This policy explains what we collect and
        how we use it. It is a template to be reviewed by your legal counsel
        before launch.
      </p>

      <h2 className="text-lg font-semibold">Information we collect</h2>
      <ul className="list-inside list-disc space-y-1">
        <li>Account data: your name and email (via Supabase Auth).</li>
        <li>
          Workspace &amp; brand data: business name, logo, colors, fonts, and
          contact details you enter.
        </li>
        <li>
          Design content: the designs, uploaded images, and AI-generated copy
          and images you create.
        </li>
        <li>
          Usage data: product events used to measure activation and improve the
          service (no third-party ad tracking).
        </li>
        <li>
          Billing data: subscription status handled by our payment provider
          (Paddle). We do not store full card numbers.
        </li>
      </ul>

      <h2 className="text-lg font-semibold">How we use it</h2>
      <p>
        To provide and improve the service, generate content you request,
        process subscriptions, provide support, and keep the platform secure.
        AI generation requests are sent to our AI provider to produce your
        content and are not used to identify you.
      </p>

      <h2 className="text-lg font-semibold">Data sharing</h2>
      <p>
        We share data only with the processors that run the service: Supabase
        (database, auth, storage), our AI provider (content generation), Paddle
        (billing), and our email/analytics/monitoring providers. We do not sell
        your data.
      </p>

      <h2 className="text-lg font-semibold">Your rights</h2>
      <p>
        You can access, correct, export, or delete your data. Contact us to
        exercise these rights. Deleting a workspace removes its brand and design
        data.
      </p>

      <h2 className="text-lg font-semibold">Contact</h2>
      <p>Email: privacy@your-domain.example</p>
    </article>
  );
}
