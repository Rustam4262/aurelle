import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-serif text-xl text-foreground ml-4">Terms of Service</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-serif text-4xl text-foreground">Terms of Service</h2>
            <p className="text-muted-foreground">Last updated: February 2026</p>
          </div>

          {/* Content */}
          <Card className="p-8 space-y-6">
            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">1. Acceptance of Terms</h3>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using the AURELLE platform (&ldquo;Service&rdquo;), you agree to be
                bound by these Terms of Service. If you do not agree to these terms, please do not
                use our Service.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">2. Description of Service</h3>
              <p className="text-muted-foreground leading-relaxed">
                AURELLE is a digital platform connecting beauty service clients with salons and
                independent masters across Uzbekistan. We provide online booking, scheduling, and
                payment processing services.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">3. User Accounts</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>• You must provide accurate and complete information when creating an account</p>
                <p>
                  • You are responsible for maintaining the confidentiality of your account
                  credentials
                </p>
                <p>• You must notify us immediately of any unauthorized access to your account</p>
                <p>• One person or entity may not maintain multiple accounts</p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">4. Bookings and Cancellations</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>
                  • Bookings are subject to availability and confirmation by the salon or master
                </p>
                <p>
                  • Cancellation policies are set by individual salons and displayed at the time of
                  booking
                </p>
                <p>
                  • Late cancellations (less than 24 hours) may incur fees as determined by the
                  service provider
                </p>
                <p>• No-shows may result in booking restrictions on your account</p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">5. Payments and Fees</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>• All prices are displayed in Uzbek Som (UZS)</p>
                <p>
                  • AURELLE charges a service fee for platform usage (details provided at booking)
                </p>
                <p>• Payment methods accepted include cards and local payment systems</p>
                <p>
                  • Refunds are handled according to the service provider&apos;s cancellation policy
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">6. User Conduct</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>You agree NOT to:</p>
                <p>• Use the Service for any illegal purpose</p>
                <p>• Harass, abuse, or harm other users or service providers</p>
                <p>• Post false, misleading, or fraudulent information</p>
                <p>• Attempt to gain unauthorized access to the platform</p>
                <p>• Use automated systems (bots) to access the Service</p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">7. Intellectual Property</h3>
              <p className="text-muted-foreground leading-relaxed">
                All content on the AURELLE platform, including text, graphics, logos, and software,
                is the property of AURELLE or its content suppliers and is protected by intellectual
                property laws.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">8. Limitation of Liability</h3>
              <p className="text-muted-foreground leading-relaxed">
                AURELLE acts as an intermediary platform. We are not responsible for the quality,
                safety, or legality of services provided by salons and masters. Users engage with
                service providers at their own risk.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">9. Dispute Resolution</h3>
              <p className="text-muted-foreground leading-relaxed">
                Any disputes arising from these Terms will be resolved through mediation or
                arbitration in accordance with the laws of Uzbekistan.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">10. Changes to Terms</h3>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. Continued use of the Service
                after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">11. Contact Information</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>For questions about these Terms, please contact us:</p>
                <p>• Email: legal@aurelle.uz</p>
                <p>• Phone: +998 (93) 261-18-04</p>
                <p>• Address: Tashkent, Uzbekistan</p>
              </div>
            </section>
          </Card>

          {/* Back button */}
          <div className="text-center">
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
