import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: 2026-07-30</p>

      <p>
        These terms govern your use of DentBrand AI. This is a template to be
        reviewed by your legal counsel before launch.
      </p>

      <h2 className="text-lg font-semibold">Your account</h2>
      <p>
        You are responsible for your account and for the accuracy of the
        business information you provide. Workspaces have roles (owner, admin,
        editor, viewer) that control what members can do.
      </p>

      <h2 className="text-lg font-semibold">Acceptable use</h2>
      <p>
        You agree to use the service lawfully and to own or have rights to the
        brand assets you upload. You are responsible for the content you publish
        from designs you create, including any claims, offers, or medical
        information. Our AI tools are aids, not medical advice.
      </p>

      <h2 className="text-lg font-semibold">Subscriptions &amp; credits</h2>
      <p>
        Paid plans grant a monthly design and image-credit allowance. Credits
        reset monthly and do not roll over. A failed AI generation is not
        charged. Subscriptions are handled by Paddle and can be cancelled at any
        time from your billing page; access continues until the end of the paid
        period. See our Refund Policy for details.
      </p>

      <h2 className="text-lg font-semibold">Availability &amp; changes</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service.
        We may update these terms; material changes will be communicated in
        advance where practical.
      </p>

      <h2 className="text-lg font-semibold">Contact</h2>
      <p>Email: support@your-domain.example</p>
    </article>
  );
}
