import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Shield } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function PrivacyPage() {
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
            <h1 className="font-serif text-xl text-foreground ml-4">Privacy Policy</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-serif text-4xl text-foreground">Privacy Policy</h2>
            <p className="text-muted-foreground">Last updated: February 2026</p>
          </div>

          {/* Content */}
          <Card className="p-8 space-y-6">
            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">1. Introduction</h3>
              <p className="text-muted-foreground leading-relaxed">
                AURELLE ("we", "us", or "our") respects your privacy and is committed to protecting your
                personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your
                information when you use our platform.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">2. Information We Collect</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">2.1 Information You Provide</h4>
                  <div className="space-y-1 text-muted-foreground leading-relaxed">
                    <p>• Name, email address, and phone number</p>
                    <p>• Profile information and photos</p>
                    <p>• Payment information (processed securely through payment providers)</p>
                    <p>• Booking details and preferences</p>
                    <p>• Reviews and ratings you submit</p>
                    <p>• Communications with us or service providers</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">2.2 Automatically Collected Information</h4>
                  <div className="space-y-1 text-muted-foreground leading-relaxed">
                    <p>• Device information (type, operating system, browser)</p>
                    <p>• IP address and approximate location</p>
                    <p>• Usage data (pages visited, time spent, features used)</p>
                    <p>• Cookies and similar tracking technologies</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">3. How We Use Your Information</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>We use your information to:</p>
                <p>• Provide and maintain our Service</p>
                <p>• Process bookings and payments</p>
                <p>• Send booking confirmations and reminders</p>
                <p>• Improve and personalize your experience</p>
                <p>• Communicate important updates about the Service</p>
                <p>• Prevent fraud and ensure platform security</p>
                <p>• Comply with legal obligations</p>
                <p>• Send marketing communications (with your consent)</p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">4. Information Sharing and Disclosure</h3>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  We may share your information with:
                </p>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4.1 Service Providers</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    When you make a booking, we share necessary information (name, phone, booking details) with
                    the salon or master to fulfill the service.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4.2 Third-Party Service Providers</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    We work with trusted partners for payment processing, analytics, email delivery, and other
                    essential services. These partners are bound by confidentiality agreements.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4.3 Legal Requirements</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    We may disclose your information if required by law, court order, or government regulations,
                    or to protect our rights and safety.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">5. Data Security</h3>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your data, including:
              </p>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>• Encryption of data in transit and at rest</p>
                <p>• Secure payment processing (PCI DSS compliant)</p>
                <p>• Regular security audits and updates</p>
                <p>• Access controls and employee training</p>
                <p>• Monitoring for suspicious activity</p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">6. Your Privacy Rights</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>You have the right to:</p>
                <p>• Access your personal data</p>
                <p>• Correct inaccurate or incomplete data</p>
                <p>• Request deletion of your data (subject to legal requirements)</p>
                <p>• Object to or restrict certain processing activities</p>
                <p>• Data portability (receive your data in a structured format)</p>
                <p>• Withdraw consent for marketing communications</p>
                <p>• Lodge a complaint with a data protection authority</p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">7. Cookies and Tracking</h3>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to:
              </p>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>• Remember your preferences and settings</p>
                <p>• Analyze website traffic and usage patterns</p>
                <p>• Improve platform performance</p>
                <p>• Deliver personalized content and advertisements</p>
              </div>
              <p className="text-muted-foreground leading-relaxed mt-3">
                You can control cookies through your browser settings, but some features may not function
                properly if cookies are disabled.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">8. Data Retention</h3>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal data for as long as necessary to provide our Service and comply with
                legal obligations. When data is no longer needed, we securely delete or anonymize it.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">9. Children's Privacy</h3>
              <p className="text-muted-foreground leading-relaxed">
                AURELLE is not intended for users under 16 years of age. We do not knowingly collect data from
                children. If you believe we have inadvertently collected such data, please contact us
                immediately.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">10. International Data Transfers</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your data may be transferred to and processed in countries other than Uzbekistan. We ensure
                appropriate safeguards are in place for such transfers.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">11. Changes to This Policy</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes
                by email or through a prominent notice on our platform.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-2xl font-serif text-foreground">12. Contact Us</h3>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                <p>For privacy-related questions or to exercise your rights, contact us:</p>
                <p>• Email: privacy@aurelle.uz</p>
                <p>• Phone: +998 (12) 345-67-89</p>
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
