import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, changeLanguage } from "@/lib/i18n";
import {
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  ArrowRight,
  Scissors,
  Sparkles,
  Heart,
  Instagram,
  Facebook,
  Send,
  ChevronRight,
  Globe,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import heroImage from "@assets/stock_images/luxury_beauty_salon__29a49bfb.jpg";
import hairImage from "@assets/stock_images/professional_hair_co_bb7062a0.jpg";
import facialImage from "@assets/stock_images/facial_spa_treatment_d93c5b9f.jpg";
import nailImage from "@assets/stock_images/professional_manicur_d36d8576.jpg";
import makeupImage from "@assets/stock_images/professional_makeup__5e401efd.jpg";
import massageImage from "@assets/stock_images/relaxing_massage_spa_498ae86d.jpg";
import stylist1 from "@assets/stock_images/professional_hairsty_1e641329.jpg";
import stylist2 from "@assets/stock_images/professional_hairsty_b53f4485.jpg";
import stylist3 from "@assets/stock_images/professional_hairsty_ec115084.jpg";
import stylist4 from "@assets/stock_images/professional_hairsty_de26541c.jpg";
import client1 from "@assets/stock_images/happy_woman_client_b_d8ba12db.jpg";
import client2 from "@assets/stock_images/happy_woman_client_b_55182bf5.jpg";
import client3 from "@assets/stock_images/happy_woman_client_b_a10a2f35.jpg";

const services = [
  {
    id: 1,
    nameKey: "services.hairStyling.title",
    descriptionKey: "services.hairStyling.description",
    image: hairImage,
    duration: "60-120",
    priceMin: 750000,
    priceMax: 2500000,
    icon: Scissors,
  },
  {
    id: 2,
    nameKey: "services.facialTreatments.title",
    descriptionKey: "services.facialTreatments.description",
    image: facialImage,
    duration: "45-90",
    priceMin: 850000,
    priceMax: 1800000,
    icon: Sparkles,
  },
  {
    id: 3,
    nameKey: "services.nailArt.title",
    descriptionKey: "services.nailArt.description",
    image: nailImage,
    duration: "30-75",
    priceMin: 350000,
    priceMax: 950000,
    icon: Heart,
  },
  {
    id: 4,
    nameKey: "services.makeup.title",
    descriptionKey: "services.makeup.description",
    image: makeupImage,
    duration: "60-90",
    priceMin: 1200000,
    priceMax: 3500000,
    icon: Sparkles,
  },
  {
    id: 5,
    nameKey: "services.spa.title",
    descriptionKey: "services.spa.description",
    image: massageImage,
    duration: "60-120",
    priceMin: 950000,
    priceMax: 2000000,
    icon: Heart,
  },
  {
    id: 6,
    nameKey: "services.bridal.title",
    descriptionKey: "services.bridal.description",
    image: facialImage,
    duration: "180-300",
    priceMin: 3000000,
    priceMax: 8000000,
    icon: Sparkles,
  },
];

const team = [
  {
    id: 1,
    nameKey: "team.members.sofia.name",
    roleKey: "team.members.sofia.role",
    bioKey: "team.members.sofia.bio",
    experience: 15,
    image: stylist1,
  },
  {
    id: 2,
    nameKey: "team.members.alex.name",
    roleKey: "team.members.alex.role",
    bioKey: "team.members.alex.bio",
    experience: 10,
    image: stylist2,
  },
  {
    id: 3,
    nameKey: "team.members.maria.name",
    roleKey: "team.members.maria.role",
    bioKey: "team.members.maria.bio",
    experience: 8,
    image: stylist3,
  },
  {
    id: 4,
    nameKey: "team.members.james.name",
    roleKey: "team.members.james.role",
    bioKey: "team.members.james.bio",
    experience: 12,
    image: stylist4,
  },
];

const testimonials = [
  {
    id: 1,
    nameKey: "testimonials.reviews.review1.name",
    textKey: "testimonials.reviews.review1.text",
    rating: 5,
    image: client1,
  },
  {
    id: 2,
    nameKey: "testimonials.reviews.review2.name",
    textKey: "testimonials.reviews.review2.text",
    rating: 5,
    image: client2,
  },
  {
    id: 3,
    nameKey: "testimonials.reviews.review3.name",
    textKey: "testimonials.reviews.review3.text",
    rating: 5,
    image: client3,
  },
];

const languages = [
  { code: "en", name: "EN" },
  { code: "ru", name: "RU" },
  { code: "uz", name: "UZ" },
];

function LanguageSwitcher({ scrolled }: { scrolled: boolean }) {
  const { i18n } = useTranslation();
  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1 px-2 ${
            scrolled ? "text-foreground" : "text-white hover:bg-white/20"
          }`}
          data-testid="button-language-switcher"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang.code.toUpperCase()}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className="gap-2"
            data-testid={`button-lang-${lang.code}`}
          >
            <span>{lang.name}</span>
            {lang.code === i18n.language && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Navigation({ scrolled }: { scrolled: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const navItems = [
    { key: "services", label: t("nav.services") },
    { key: "team", label: t("nav.team") },
    { key: "gallery", label: t("nav.gallery") },
    { key: "testimonials", label: t("nav.testimonials") },
    { key: "contact", label: t("nav.contact") },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <a href="#" className="flex items-center gap-2" data-testid="link-logo">
            <span
              className={`font-serif text-2xl font-semibold tracking-tight ${
                scrolled ? "text-foreground" : "text-white"
              }`}
            >
              Lumiere
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.key}
                href={`#${item.key}`}
                className={`text-sm font-medium transition-colors hover:opacity-80 ${
                  scrolled ? "text-foreground" : "text-white/90"
                }`}
                data-testid={`link-nav-${item.key}`}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher scrolled={scrolled} />
            <a href="#contact">
              <Button
                className={`rounded-full px-6 ${
                  scrolled
                    ? ""
                    : "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30"
                }`}
                data-testid="button-book-nav"
              >
                {t("nav.book")}
              </Button>
            </a>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher scrolled={scrolled} />
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className={scrolled ? "text-foreground" : "text-white"} />
              ) : (
                <Menu className={scrolled ? "text-foreground" : "text-white"} />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-background border-t border-border">
          <div className="px-6 py-4 flex flex-col gap-4">
            {navItems.map((item) => (
              <a
                key={item.key}
                href={`#${item.key}`}
                className="text-foreground py-2"
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`link-mobile-nav-${item.key}`}
              >
                {item.label}
              </a>
            ))}
            <a href="#contact" onClick={() => setMobileMenuOpen(false)}>
              <Button className="rounded-full mt-2 w-full" data-testid="button-book-mobile">
                {t("nav.book")}
              </Button>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative h-[90vh] min-h-[600px] flex items-center justify-center"
      data-testid="section-hero"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        <p className="text-white/80 text-sm uppercase tracking-[0.3em] mb-4 font-medium">
          Lumiere Beauty Salon
        </p>
        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-white font-light leading-tight mb-6">
          {t("hero.title")}
        </h1>
        <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light">
          {t("hero.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#contact">
            <Button
              size="lg"
              className="rounded-full px-8 py-6 text-base bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30"
              data-testid="button-book-hero"
            >
              {t("hero.cta")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
          <a href="#services">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8 py-6 text-base border-white/30 text-white hover:bg-white/10 bg-transparent"
              data-testid="button-explore-hero"
            >
              {t("hero.explore")}
            </Button>
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-white/50 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  const { t } = useTranslation();

  return (
    <section id="services" className="py-24 bg-background" data-testid="section-services">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            {t("services.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("services.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <Card
              key={service.id}
              className="group overflow-hidden hover-elevate"
              data-testid={`card-service-${service.id}`}
            >
              <div className="aspect-[4/3] relative overflow-hidden">
                <img
                  src={service.image}
                  alt={t(service.nameKey)}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration} {t("services.minutes")}</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="font-serif text-xl text-foreground">
                    {t(service.nameKey)}
                  </h3>
                  <service.icon className="h-5 w-5 text-primary flex-shrink-0" />
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  {t(service.descriptionKey)}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-medium text-sm">
                    {formatCurrency(service.priceMin)} - {formatCurrency(service.priceMax)}
                  </span>
                  <a href="#contact">
                    <Button variant="ghost" size="sm" className="text-primary">
                      {t("nav.book")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection() {
  const { t } = useTranslation();
  const images = [hairImage, facialImage, nailImage, makeupImage, massageImage, heroImage];

  return (
    <section id="gallery" className="py-24 bg-card" data-testid="section-gallery">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            {t("gallery.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("gallery.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-md ${
                index === 0 ? "md:col-span-2 md:row-span-2" : ""
              }`}
              data-testid={`gallery-image-${index}`}
            >
              <img
                src={image}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover aspect-square hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamSection() {
  const { t } = useTranslation();

  return (
    <section id="team" className="py-24 bg-background" data-testid="section-team">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            {t("team.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("team.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member) => (
            <div
              key={member.id}
              className="group text-center"
              data-testid={`card-team-${member.id}`}
            >
              <div className="relative mb-6 mx-auto w-48 h-48 rounded-full overflow-hidden">
                <img
                  src={member.image}
                  alt={t(member.nameKey)}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <h3 className="font-serif text-xl text-foreground mb-1">
                {t(member.nameKey)}
              </h3>
              <p className="text-primary text-sm mb-2">{t(member.roleKey)}</p>
              <p className="text-muted-foreground text-sm mb-2">
                {member.experience}+ {t("team.experience")}
              </p>
              <p className="text-muted-foreground text-sm px-4">
                {t(member.bioKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { t } = useTranslation();

  return (
    <section
      id="testimonials"
      className="py-24 bg-card"
      data-testid="section-testimonials"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            {t("testimonials.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("testimonials.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.id}
              className="p-8"
              data-testid={`card-testimonial-${testimonial.id}`}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-primary text-primary"
                  />
                ))}
              </div>
              <p className="text-foreground mb-6 italic">
                "{t(testimonial.textKey)}"
              </p>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={testimonial.image} />
                  <AvatarFallback>
                    {t(testimonial.nameKey)
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {t(testimonial.nameKey)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });

  const contactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      toast({
        title: t("contact.success.title"),
        description: t("contact.success.description"),
      });
      setFormData({ name: "", email: "", phone: "", service: "", message: "" });
    },
    onError: () => {
      toast({
        title: t("contact.error.title"),
        description: t("contact.error.description"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    contactMutation.mutate(formData);
  };

  const serviceOptions = [
    { value: "hair", labelKey: "services.hairStyling.title" },
    { value: "facial", labelKey: "services.facialTreatments.title" },
    { value: "nails", labelKey: "services.nailArt.title" },
    { value: "makeup", labelKey: "services.makeup.title" },
    { value: "spa", labelKey: "services.spa.title" },
    { value: "bridal", labelKey: "services.bridal.title" },
  ];

  return (
    <section id="contact" className="py-24 bg-background" data-testid="section-contact">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-4">
            {t("contact.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("contact.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    {t("contact.form.name")}
                  </label>
                  <Input
                    placeholder={t("contact.form.namePlaceholder")}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    {t("contact.form.email")}
                  </label>
                  <Input
                    type="email"
                    placeholder={t("contact.form.emailPlaceholder")}
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    {t("contact.form.phone")}
                  </label>
                  <Input
                    type="tel"
                    placeholder={t("contact.form.phonePlaceholder")}
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    data-testid="input-phone"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    {t("contact.form.service")}
                  </label>
                  <select
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm"
                    value={formData.service}
                    onChange={(e) =>
                      setFormData({ ...formData, service: e.target.value })
                    }
                    data-testid="select-service"
                  >
                    <option value="">{t("contact.form.servicePlaceholder")}</option>
                    {serviceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  {t("contact.form.message")}
                </label>
                <Textarea
                  placeholder={t("contact.form.messagePlaceholder")}
                  rows={4}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  data-testid="textarea-message"
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={contactMutation.isPending}
                data-testid="button-submit-contact"
              >
                {contactMutation.isPending ? (
                  t("contact.form.sending")
                ) : (
                  <>
                    {t("contact.form.submit")}
                    <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Card>

          <div className="space-y-8">
            <Card className="p-8">
              <h3 className="font-serif text-2xl text-foreground mb-6">
                {t("contact.info.title")}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t("contact.info.address")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t("contact.info.city")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t("contact.info.phone")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t("contact.info.email")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t("contact.info.hours")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t("contact.info.weekdays")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t("contact.info.saturday")}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t("contact.info.sunday")}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <div className="relative h-48 bg-muted">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                  <div className="text-center">
                    <MapPin className="h-10 w-10 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {t("contact.info.address")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("contact.info.city")}
                    </p>
                    <a
                      href="https://maps.google.com/?q=Amir+Temur+Street+123+Tashkent+Uzbekistan"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3"
                    >
                      <Button variant="outline" size="sm" className="rounded-full">
                        {t("contact.info.getDirections")}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm">
                {t("contact.info.followUs")}
              </span>
              <Button variant="ghost" size="icon" data-testid="link-instagram">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" data-testid="link-facebook">
                <Facebook className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const newsletterMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      return apiRequest("POST", "/api/newsletter", data);
    },
    onSuccess: () => {
      toast({
        title: t("footer.subscribed.title"),
        description: t("footer.subscribed.description"),
      });
      setEmail("");
    },
    onError: () => {
      toast({
        title: t("contact.error.title"),
        description: t("contact.error.description"),
        variant: "destructive",
      });
    },
  });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      newsletterMutation.mutate({ email });
    }
  };

  const navItems = [
    { key: "services", label: t("nav.services") },
    { key: "team", label: t("nav.team") },
    { key: "gallery", label: t("nav.gallery") },
    { key: "testimonials", label: t("nav.testimonials") },
    { key: "contact", label: t("nav.contact") },
  ];

  return (
    <footer className="bg-card border-t border-border" data-testid="section-footer">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-2">
            <span className="font-serif text-2xl font-semibold text-foreground mb-4 block">
              Lumiere
            </span>
            <p className="text-muted-foreground mb-6 max-w-md">
              {t("footer.tagline")}
            </p>
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex gap-2 max-w-md"
            >
              <Input
                type="email"
                placeholder={t("footer.newsletter")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-full"
                data-testid="input-newsletter"
              />
              <Button
                type="submit"
                className="rounded-full px-6"
                data-testid="button-subscribe"
                disabled={newsletterMutation.isPending}
              >
                {newsletterMutation.isPending ? "..." : t("footer.subscribe")}
              </Button>
            </form>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-4">
              {t("footer.quickLinks")}
            </h4>
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.key}>
                  <a
                    href={`#${item.key}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-footer-${item.key}`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-4">
              {t("footer.contactTitle")}
            </h4>
            <div className="space-y-3 text-muted-foreground text-sm">
              <p>{t("contact.info.address")}</p>
              <p>{t("contact.info.city")}</p>
              <p>{t("contact.info.phone")}</p>
              <p>{t("contact.info.email")}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" data-testid="link-footer-instagram">
              <Instagram className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" data-testid="link-footer-facebook">
              <Facebook className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation scrolled={scrolled} />
      <HeroSection />
      <ServicesSection />
      <GallerySection />
      <TeamSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
