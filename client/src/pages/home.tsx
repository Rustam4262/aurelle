import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
} from "lucide-react";

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
    name: "Hair Styling & Coloring",
    description: "Transform your look with expert cuts, colors, and styling tailored to your unique beauty.",
    image: hairImage,
    duration: "60-120 min",
    priceRange: "$75 - $250",
    icon: Scissors,
  },
  {
    id: 2,
    name: "Facial Treatments",
    description: "Rejuvenate your skin with our premium facials using organic and luxury skincare products.",
    image: facialImage,
    duration: "45-90 min",
    priceRange: "$85 - $180",
    icon: Sparkles,
  },
  {
    id: 3,
    name: "Nail Artistry",
    description: "Express yourself with stunning manicures, pedicures, and intricate nail art designs.",
    image: nailImage,
    duration: "30-75 min",
    priceRange: "$35 - $95",
    icon: Heart,
  },
  {
    id: 4,
    name: "Bridal & Event Makeup",
    description: "Look flawless for your special day with our professional makeup artistry services.",
    image: makeupImage,
    duration: "60-90 min",
    priceRange: "$120 - $350",
    icon: Sparkles,
  },
  {
    id: 5,
    name: "Spa & Massage",
    description: "Unwind and relax with our therapeutic massage and spa body treatments.",
    image: massageImage,
    duration: "60-120 min",
    priceRange: "$95 - $200",
    icon: Heart,
  },
  {
    id: 6,
    name: "Lash & Brow",
    description: "Frame your face beautifully with expert lash extensions and brow shaping.",
    image: facialImage,
    duration: "30-90 min",
    priceRange: "$45 - $150",
    icon: Sparkles,
  },
];

const team = [
  {
    id: 1,
    name: "Sophie Laurent",
    role: "Master Stylist & Owner",
    specialties: ["Hair Coloring", "Balayage", "Bridal"],
    experience: "15+ years",
    image: stylist1,
  },
  {
    id: 2,
    name: "Isabella Chen",
    role: "Senior Esthetician",
    specialties: ["Facials", "Skincare", "Anti-aging"],
    experience: "10+ years",
    image: stylist2,
  },
  {
    id: 3,
    name: "Mia Rodriguez",
    role: "Nail Artist",
    specialties: ["Nail Art", "Gel Extensions", "Manicures"],
    experience: "8+ years",
    image: stylist3,
  },
  {
    id: 4,
    name: "Emma Williams",
    role: "Makeup Artist",
    specialties: ["Bridal", "Editorial", "Special Effects"],
    experience: "12+ years",
    image: stylist4,
  },
];

const testimonials = [
  {
    id: 1,
    name: "Jennifer Adams",
    service: "Hair Coloring & Styling",
    rating: 5,
    text: "Sophie transformed my hair completely! The balayage is exactly what I dreamed of. The salon atmosphere is so relaxing and luxurious.",
    image: client1,
  },
  {
    id: 2,
    name: "Michelle Park",
    service: "Bridal Package",
    rating: 5,
    text: "My wedding day look was absolutely perfect. The team made me feel like a princess. Everyone was so professional and attentive.",
    image: client2,
  },
  {
    id: 3,
    name: "Sarah Thompson",
    service: "Facial Treatment",
    rating: 5,
    text: "Best facial I've ever had! My skin is glowing and the products they use are incredible. I'm now a regular client.",
    image: client3,
  },
];

function Navigation({ scrolled }: { scrolled: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            {["Services", "Team", "Gallery", "Testimonials", "Contact"].map(
              (item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className={`text-sm font-medium transition-colors hover:opacity-80 ${
                    scrolled ? "text-foreground" : "text-white/90"
                  }`}
                  data-testid={`link-nav-${item.toLowerCase()}`}
                >
                  {item}
                </a>
              )
            )}
          </div>

          <div className="hidden md:block">
            <a href="#contact">
              <Button
                className={`rounded-full px-6 ${
                  scrolled
                    ? ""
                    : "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30"
                }`}
                data-testid="button-book-nav"
              >
                Book Appointment
              </Button>
            </a>
          </div>

          <button
            className="md:hidden p-2"
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

      {mobileMenuOpen && (
        <div className="md:hidden bg-background border-t border-border">
          <div className="px-6 py-4 flex flex-col gap-4">
            {["Services", "Team", "Gallery", "Testimonials", "Contact"].map(
              (item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-foreground py-2"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`link-mobile-nav-${item.toLowerCase()}`}
                >
                  {item}
                </a>
              )
            )}
            <a href="#contact" onClick={() => setMobileMenuOpen(false)}>
              <Button className="rounded-full mt-2 w-full" data-testid="button-book-mobile">
                Book Appointment
              </Button>
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
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
          Premium Beauty Experience
        </p>
        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-white font-light leading-tight mb-6">
          Where Beauty
          <span className="block italic">Meets Artistry</span>
        </h1>
        <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light">
          Discover your most radiant self at Lumiere. Our expert stylists and
          estheticians create personalized beauty experiences that leave you
          feeling confident and beautiful.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#contact">
            <Button
              size="lg"
              className="rounded-full px-8 py-6 text-base bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30"
              data-testid="button-book-hero"
            >
              Book Your Appointment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
          <a href="#services">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8 py-6 text-base bg-transparent border-white/40 text-white hover:bg-white/10"
              data-testid="button-services-hero"
            >
              Explore Services
            </Button>
          </a>
        </div>
        <div className="mt-12 flex items-center justify-center gap-6 text-white/70 text-sm">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-current text-yellow-400" />
            <span>5.0 Rating</span>
          </div>
          <div className="w-px h-4 bg-white/30" />
          <span>Serving Los Angeles since 2010</span>
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section id="services" className="py-20 lg:py-32 bg-background" data-testid="section-services">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-3">
            Our Services
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-light text-foreground mb-4">
            Beauty Treatments
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            From hair transformations to relaxing spa treatments, we offer a
            complete range of beauty services tailored to your needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <Card
              key={service.id}
              className="group overflow-hidden hover-elevate"
              data-testid={`card-service-${service.id}`}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={service.image}
                  alt={service.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-xl font-medium text-foreground">
                    {service.name}
                  </h3>
                  <service.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {service.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration}</span>
                  </div>
                  <span className="font-medium text-foreground">
                    {service.priceRange}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  className="w-full mt-4 group/btn"
                  data-testid={`button-view-service-${service.id}`}
                >
                  View Details
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection() {
  const galleryImages = [
    { src: hairImage, alt: "Hair styling transformation" },
    { src: facialImage, alt: "Facial treatment" },
    { src: nailImage, alt: "Nail art design" },
    { src: makeupImage, alt: "Bridal makeup" },
    { src: massageImage, alt: "Spa massage" },
    { src: heroImage, alt: "Salon interior" },
  ];

  return (
    <section id="gallery" className="py-20 lg:py-32 bg-card" data-testid="section-gallery">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-3">
            Our Work
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-light text-foreground mb-4">
            Beauty Gallery
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Browse through our portfolio of stunning transformations and
            treatments.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryImages.map((image, index) => (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-lg ${
                index === 0 || index === 5 ? "md:row-span-2" : ""
              }`}
              data-testid={`gallery-image-${index}`}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover aspect-square transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end">
                <p className="text-white p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
                  {image.alt}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamSection() {
  return (
    <section id="team" className="py-20 lg:py-32 bg-background" data-testid="section-team">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-3">
            Meet The Experts
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-light text-foreground mb-4">
            Our Team
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Passionate professionals dedicated to bringing out your natural
            beauty.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member) => (
            <Card
              key={member.id}
              className="text-center p-6 hover-elevate"
              data-testid={`card-team-${member.id}`}
            >
              <div className="mb-4 mx-auto">
                <Avatar className="w-32 h-32 mx-auto ring-4 ring-primary/10">
                  <AvatarImage src={member.image} alt={member.name} />
                  <AvatarFallback>
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              </div>
              <h3 className="font-serif text-xl font-medium text-foreground mb-1">
                {member.name}
              </h3>
              <p className="text-primary text-sm font-medium mb-3">
                {member.role}
              </p>
              <div className="flex flex-wrap justify-center gap-1 mb-4">
                {member.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground text-sm">
                {member.experience} experience
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-full"
                data-testid={`button-book-${member.id}`}
              >
                Book with {member.name.split(" ")[0]}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="py-20 lg:py-32 bg-card"
      data-testid="section-testimonials"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-3">
            Client Love
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-light text-foreground mb-4">
            Testimonials
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            See what our happy clients have to say about their Lumiere
            experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.id}
              className="p-6"
              data-testid={`card-testimonial-${testimonial.id}`}
            >
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={testimonial.image} alt={testimonial.name} />
                  <AvatarFallback>
                    {testimonial.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium text-foreground">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.service}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-muted-foreground italic leading-relaxed">
                "{testimonial.text}"
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent!",
        description: "We'll get back to you within 24 hours.",
      });
      setFormData({ name: "", email: "", phone: "", service: "", message: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <section id="contact" className="py-20 lg:py-32 bg-background" data-testid="section-contact">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div>
            <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-3">
              Get In Touch
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-foreground mb-6">
              Book Your Visit
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Ready to experience the Lumiere difference? Contact us to schedule
              your appointment or ask any questions.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="rounded-lg px-4 py-3"
                  data-testid="input-name"
                />
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="rounded-lg px-4 py-3"
                  data-testid="input-email"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="rounded-lg px-4 py-3"
                  data-testid="input-phone"
                />
                <Input
                  placeholder="Service Interested In"
                  value={formData.service}
                  onChange={(e) =>
                    setFormData({ ...formData, service: e.target.value })
                  }
                  className="rounded-lg px-4 py-3"
                  data-testid="input-service"
                />
              </div>
              <Textarea
                placeholder="Your Message"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={4}
                className="rounded-lg"
                data-testid="input-message"
              />
              <Button
                type="submit"
                size="lg"
                className="rounded-full px-8"
                disabled={mutation.isPending}
                data-testid="button-submit-contact"
              >
                {mutation.isPending ? "Sending..." : "Send Message"}
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="lg:pl-12">
            <Card className="p-8 mb-8">
              <h3 className="font-serif text-2xl font-medium text-foreground mb-6">
                Salon Information
              </h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">
                      Location
                    </h4>
                    <p className="text-muted-foreground">
                      1234 Sunset Boulevard
                      <br />
                      Los Angeles, CA 90028
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Phone</h4>
                    <p className="text-muted-foreground">(310) 555-0123</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Email</h4>
                    <p className="text-muted-foreground">hello@lumiere.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">
                      Business Hours
                    </h4>
                    <div className="text-muted-foreground text-sm space-y-1">
                      <p>Monday - Friday: 9:00 AM - 8:00 PM</p>
                      <p>Saturday: 9:00 AM - 6:00 PM</p>
                      <p>Sunday: 10:00 AM - 5:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden mb-8">
              <div className="relative h-48 bg-muted">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                  <div className="text-center">
                    <MapPin className="h-10 w-10 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">
                      1234 Sunset Boulevard
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Los Angeles, CA 90028
                    </p>
                    <a 
                      href="https://maps.google.com/?q=1234+Sunset+Boulevard+Los+Angeles+CA" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block mt-3"
                    >
                      <Button variant="outline" size="sm" className="rounded-full">
                        Get Directions
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex items-center gap-4">
              <span className="text-muted-foreground text-sm">Follow us:</span>
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
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const newsletterMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      return apiRequest("POST", "/api/newsletter", data);
    },
    onSuccess: () => {
      toast({
        title: "Subscribed!",
        description: "Thank you for joining our newsletter.",
      });
      setEmail("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again.",
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

  return (
    <footer className="bg-card border-t border-border" data-testid="section-footer">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-2">
            <span className="font-serif text-2xl font-semibold text-foreground mb-4 block">
              Lumiere
            </span>
            <p className="text-muted-foreground mb-6 max-w-md">
              Where beauty meets artistry. Experience luxury beauty treatments
              in a relaxing, sophisticated environment.
            </p>
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex gap-2 max-w-md"
            >
              <Input
                type="email"
                placeholder="Enter your email for beauty tips"
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
                {newsletterMutation.isPending ? "..." : "Subscribe"}
              </Button>
            </form>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {["Services", "Team", "Gallery", "Testimonials", "Contact"].map(
                (item) => (
                  <li key={item}>
                    <a
                      href={`#${item.toLowerCase()}`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      data-testid={`link-footer-${item.toLowerCase()}`}
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-4">Contact</h4>
            <div className="space-y-3 text-muted-foreground text-sm">
              <p>1234 Sunset Boulevard</p>
              <p>Los Angeles, CA 90028</p>
              <p>(310) 555-0123</p>
              <p>hello@lumiere.com</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} Lumiere Beauty Salon. All rights
            reserved.
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
    <div className="min-h-screen">
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
