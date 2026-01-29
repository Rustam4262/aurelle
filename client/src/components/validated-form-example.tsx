/**
 * Validated Form Example
 * Demonstrates best practices for form validation
 *
 * Features:
 * - Real-time validation
 * - Field-level error messages
 * - Disabled submit when invalid
 * - Autofocus on first error
 * - API error handling
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { FormValidator, ValidationRules, ValidationErrors } from "@/lib/validation";
import { handleApiError } from "@/lib/error-handler";
import { useToast } from "@/hooks/use-toast";

interface FormData {
  email: string;
  phone: string;
  salonName: string;
  description: string;
  price: string;
}

export function ValidatedFormExample() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    email: "",
    phone: "",
    salonName: "",
    description: "",
    price: "",
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const validator = useRef(new FormValidator());

  // Refs for autofocus on error
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const salonNameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<string, React.RefObject<any>> = {
    email: emailRef,
    phone: phoneRef,
    salonName: salonNameRef,
    description: descriptionRef,
    price: priceRef,
  };

  /**
   * Validate single field
   */
  const validateField = (fieldName: keyof FormData, value: any) => {
    const rules: Record<string, any> = {
      email: ValidationRules.email,
      phone: ValidationRules.phone,
      salonName: ValidationRules.salonName,
      description: ValidationRules.description,
      price: ValidationRules.price,
    };

    const error = validator.current.validateField(fieldName, value, rules[fieldName]);
    if (error) {
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
    } else {
      setErrors((prev) => {
        const { [fieldName]: _, ...rest } = prev;
        return rest;
      });
    }

    return error;
  };

  /**
   * Handle field change with real-time validation
   */
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validate if field has been touched
    if (touched[field]) {
      validateField(field, value);
    }
  };

  /**
   * Handle field blur - mark as touched and validate
   */
  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  /**
   * Validate entire form
   */
  const validateForm = (): boolean => {
    const validationErrors = validator.current.validateFields({
      email: { value: formData.email, rules: ValidationRules.email },
      phone: { value: formData.phone, rules: ValidationRules.phone },
      salonName: { value: formData.salonName, rules: ValidationRules.salonName },
      description: { value: formData.description, rules: ValidationRules.description },
      price: { value: formData.price, rules: ValidationRules.price },
    });

    setErrors(validationErrors);

    // Mark all fields as touched
    setTouched({
      email: true,
      phone: true,
      salonName: true,
      description: true,
      price: true,
    });

    return validator.current.isValid();
  };

  /**
   * Focus on first error field
   */
  const focusFirstError = () => {
    const errorFields = Object.keys(errors).filter((key) => errors[key]);
    if (errorFields.length > 0) {
      const firstErrorField = errorFields[0];
      const ref = fieldRefs[firstErrorField];
      if (ref?.current) {
        ref.current.focus();
        ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  /**
   * Focus on first error when errors change
   */
  useEffect(() => {
    if (Object.keys(errors).length > 0 && Object.values(touched).some(Boolean)) {
      focusFirstError();
    }
  }, [errors]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Ошибка валидации",
        description: "Пожалуйста, исправьте ошибки в форме",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate random error for demo
      if (Math.random() > 0.7) {
        throw new Error("BOOKING_CONFLICT");
      }

      toast({
        title: "Успешно!",
        description: "Форма отправлена успешно",
      });

      // Reset form
      setFormData({
        email: "",
        phone: "",
        salonName: "",
        description: "",
        price: "",
      });
      setTouched({});
      setErrors({});
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Check if form is valid
   */
  const isFormValid = () => {
    return (
      Object.keys(errors).length === 0 &&
      formData.email &&
      formData.phone &&
      formData.salonName &&
      formData.price
    );
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-serif font-semibold mb-6">Validated Form Example</h2>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            ref={emailRef}
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            className={errors.email && touched.email ? "border-destructive" : ""}
            placeholder="example@mail.com"
            disabled={isSubmitting}
            aria-invalid={!!errors.email && touched.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && touched.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div className="space-y-2">
          <Label htmlFor="phone">
            Телефон <span className="text-destructive">*</span>
          </Label>
          <Input
            ref={phoneRef}
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            onBlur={() => handleBlur("phone")}
            className={errors.phone && touched.phone ? "border-destructive" : ""}
            placeholder="+998 XX XXX XX XX"
            disabled={isSubmitting}
            aria-invalid={!!errors.phone && touched.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && touched.phone && (
            <p id="phone-error" className="text-sm text-destructive">
              {errors.phone}
            </p>
          )}
        </div>

        {/* Salon Name Field */}
        <div className="space-y-2">
          <Label htmlFor="salonName">
            Название салона <span className="text-destructive">*</span>
          </Label>
          <Input
            ref={salonNameRef}
            id="salonName"
            type="text"
            value={formData.salonName}
            onChange={(e) => handleChange("salonName", e.target.value)}
            onBlur={() => handleBlur("salonName")}
            className={errors.salonName && touched.salonName ? "border-destructive" : ""}
            placeholder="My Beauty Salon"
            disabled={isSubmitting}
            aria-invalid={!!errors.salonName && touched.salonName}
            aria-describedby={errors.salonName ? "salonName-error" : undefined}
          />
          {errors.salonName && touched.salonName && (
            <p id="salonName-error" className="text-sm text-destructive">
              {errors.salonName}
            </p>
          )}
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <Label htmlFor="description">
            Описание
            <span className="text-muted-foreground text-sm ml-2">
              (необязательно, макс 500 символов)
            </span>
          </Label>
          <Textarea
            ref={descriptionRef}
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            onBlur={() => handleBlur("description")}
            className={errors.description && touched.description ? "border-destructive" : ""}
            placeholder="Расскажите о вашем салоне..."
            rows={4}
            disabled={isSubmitting}
            aria-invalid={!!errors.description && touched.description}
            aria-describedby={errors.description ? "description-error" : undefined}
          />
          <div className="flex justify-between items-center">
            <div>
              {errors.description && touched.description && (
                <p id="description-error" className="text-sm text-destructive">
                  {errors.description}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{formData.description.length}/500</span>
          </div>
        </div>

        {/* Price Field */}
        <div className="space-y-2">
          <Label htmlFor="price">
            Цена <span className="text-destructive">*</span>
          </Label>
          <Input
            ref={priceRef}
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => handleChange("price", e.target.value)}
            onBlur={() => handleBlur("price")}
            className={errors.price && touched.price ? "border-destructive" : ""}
            placeholder="50000"
            disabled={isSubmitting}
            min="0"
            step="1000"
            aria-invalid={!!errors.price && touched.price}
            aria-describedby={errors.price ? "price-error" : undefined}
          />
          {errors.price && touched.price && (
            <p id="price-error" className="text-sm text-destructive">
              {errors.price}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={!isFormValid() || isSubmitting} className="flex-1">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Отправка...
              </>
            ) : (
              "Отправить"
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormData({
                email: "",
                phone: "",
                salonName: "",
                description: "",
                price: "",
              });
              setTouched({});
              setErrors({});
            }}
            disabled={isSubmitting}
          >
            Очистить
          </Button>
        </div>

        {/* Form State Debug (Development only) */}
        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-xs">
            <summary className="cursor-pointer text-muted-foreground mb-2">
              Debug Info (dev only)
            </summary>
            <div className="bg-muted p-3 rounded-md space-y-2">
              <div>
                <strong>Form Valid:</strong> {isFormValid() ? "✓ Yes" : "✗ No"}
              </div>
              <div>
                <strong>Errors:</strong>{" "}
                {Object.keys(errors).length > 0 ? JSON.stringify(errors, null, 2) : "None"}
              </div>
              <div>
                <strong>Touched:</strong> {JSON.stringify(touched, null, 2)}
              </div>
            </div>
          </details>
        )}
      </form>
    </Card>
  );
}
