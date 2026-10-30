import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetPublicContactSettingsQueryKey,
  useGetPublicContactSettings,
  useSubmitContactMessage,
  type ContactMessageInput,
} from "@workspace/api-client-react";
import { ArrowUpRight, Check, Clock3, Flower2, Mail, MapPin, MessageSquareText, Phone, Send, UserRound } from "lucide-react";
import { CONTACT_CONFIG } from "@/lib/contact-config";

type ContactFormState = Omit<ContactMessageInput, "subject"> & { subject: ContactMessageInput["subject"] | "" };

const blankForm: ContactFormState = {
  full_name: "", email: "", phone: "", subject: "", message: "",
};

export default function ContactPage() {
  const queryClient = useQueryClient();
  const settings = useGetPublicContactSettings({
    query: { queryKey: getGetPublicContactSettingsQueryKey(), staleTime: 60_000 },
  });
  const submitMessage = useSubmitContactMessage();
  const [form, setForm] = useState<ContactFormState>(blankForm);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [formError, setFormError] = useState("");
  const [emailUser, emailDomain] = CONTACT_CONFIG.email.split("@");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setFormError("");
    if (!form.subject) return setFormError("Please choose a subject.");
    const payload: ContactMessageInput = {
      ...form,
      subject: form.subject as ContactMessageInput["subject"],
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone?.trim() || null,
      message: form.message.trim(),
    };
    if (payload.full_name.length < 2) return setFormError("Please enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return setFormError("Please enter a valid email address.");
    if (payload.message.length < 10) return setFormError("Please add a little more detail (at least 10 characters).");
    if (payload.message.length > 2000) return setFormError("Your message must be 2,000 characters or fewer.");
    if (payload.phone && !/^[+0-9() .-]{0,32}$/.test(payload.phone)) return setFormError("Please enter a valid phone number.");
    try {
      const received = await submitMessage.mutateAsync({ data: payload });
      if (received.received) {
        setForm(blankForm);
        setNotice({ tone: "success", text: "Your message is saved in our private inbox. Our team will review it." });
        await queryClient.invalidateQueries({ queryKey: getGetPublicContactSettingsQueryKey() });
      } else {
        setNotice({ tone: "error", text: "We couldn’t confirm that your message was stored. Please try again." });
      }
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Your message wasn’t sent. Please try again." });
    }
  };
  const set = (key: keyof ContactFormState, value: string) => setForm((current) => ({ ...current, [key]: value }) as ContactFormState);

  return <main className="mc-page mc-contact" data-testid="page-contact">
    <section className="mc-contact-hero">
      <img src="/images/hero-bottle.jpg" alt="Maya Collection signature perfume bottle among white blossoms" className="mc-contact-hero-image"/>
      <div className="mc-contact-hero-shade"/>
      <div className="mc-contact-hero-copy">
        <span className="mc-kicker">Get in touch</span>
        <span className="mc-contact-rule"/>
        <h1>Contact Us</h1>
        <p>We’d love to hear from you. Whether you have a question, feedback, or need assistance, our team is here to help.</p>
      </div>
      <Flower2 className="mc-contact-flower" aria-hidden="true"/>
    </section>

    <section className="mc-contact-ways" aria-label="Contact details">
      <article className="mc-contact-card">
        <span className="mc-contact-icon"><Phone/></span><h2>Phone</h2>
        <a className="mc-contact-detail" dir="ltr" href={CONTACT_CONFIG.phoneHref}>{CONTACT_CONFIG.phone}</a>
        <p>Speak with our team</p>
        <a className="mc-contact-card-action" dir="ltr" href={CONTACT_CONFIG.phoneHref}><Phone/>Call now</a>
      </article>
      <article className="mc-contact-card">
        <span className="mc-contact-icon"><Mail/></span><h2>Email</h2>
        <a className="mc-contact-detail" aria-label={CONTACT_CONFIG.email} href={`mailto:${CONTACT_CONFIG.email}`}>{emailUser}@<wbr/>{emailDomain}</a>
        <p>We’ll reply as soon as possible</p>
        <a className="mc-contact-card-action" href={`mailto:${CONTACT_CONFIG.email}`}><Mail/>Send email</a>
      </article>
      <article className="mc-contact-card">
        <span className="mc-contact-icon"><MapPin/></span><h2>Our Location</h2>
        <p className="mc-contact-location-note">Visit our store</p>
        <a className="mc-contact-card-action" href={CONTACT_CONFIG.mapUrl} target="_blank" rel="noreferrer"><MapPin/>Get directions</a>
      </article>
    </section>

    <section className="mc-contact-form-card">
      <div className="mc-contact-section-heading"><Flower2 aria-hidden="true"/><div><h2>We’re Here to Help</h2><p>Fill out the form below and we’ll get back to you as soon as possible.</p></div></div>
      <form className="mc-contact-form" onSubmit={submit} noValidate>
        <label className="mc-contact-field"><UserRound/><span className="sr-only">Full name</span><input autoComplete="name" required minLength={2} maxLength={100} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Full Name *" data-testid="input-contact-name"/></label>
        <label className="mc-contact-field"><Mail/><span className="sr-only">Email address</span><input type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Email Address *" data-testid="input-contact-email"/></label>
        <label className="mc-contact-field mc-contact-field-wide"><Phone/><span className="sr-only">Phone number (optional)</span><input type="tel" autoComplete="tel" maxLength={32} value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="Phone Number (Optional)" data-testid="input-contact-phone"/></label>
        <label className="mc-contact-field mc-contact-field-wide"><MessageSquareText/><span className="sr-only">Subject</span><select required value={form.subject} onChange={(e) => set("subject", e.target.value as ContactMessageInput["subject"])} data-testid="select-contact-subject">
         <option value="">Subject *</option><option value="product">Product question</option><option value="order">Order enquiry</option><option value="feedback">Feedback</option><option value="store_info">Store information</option><option value="other">Other</option>
        </select></label>
        <label className="mc-contact-field mc-contact-message"><MessageSquareText/><span className="sr-only">Your message</span><textarea required minLength={10} maxLength={2000} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Your Message *" data-testid="textarea-contact-message"/></label>
        {formError && <p className="mc-contact-error" role="alert">{formError}</p>}
        {notice && <p className={`mc-contact-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"} data-testid={`status-contact-${notice.tone}`}>{notice.tone === "success" ? <Check/> : null}{notice.text}</p>}
        <button className="mc-contact-submit" type="submit" disabled={submitMessage.isPending} data-testid="button-submit-contact">
          {submitMessage.isPending ? <><span className="mc-contact-submit-pulse"/>Saving your message…</> : <><Send/>Send message</>}
        </button>
         <p className="mc-contact-private-note">Messages are stored in the private Maya Collection admin inbox.</p>
      </form>
    </section>

    <section className="mc-contact-map-card">
       <div className="mc-contact-section-heading"><span className="mc-contact-icon is-small"><MapPin/></span><div><h2>Find Us on Map</h2><p>Decorative map preview — open Google Maps for the exact location.</p></div></div>
      <div className="mc-map-preview" aria-label="Decorative map preview. Open directions for the store location.">
        <div className="mc-map-grid"/><span className="mc-map-river"/><span className="mc-map-park park-a"/><span className="mc-map-park park-b"/>
        <a href={CONTACT_CONFIG.mapUrl} target="_blank" rel="noreferrer" className="mc-map-open" aria-label="Open map directions"><ArrowUpRight/></a>
      </div>
       <a className="mc-map-directions" href={CONTACT_CONFIG.mapUrl} target="_blank" rel="noreferrer"><Send/>Open in Google Maps<ArrowUpRight/></a>
    </section>

    <section className="mc-contact-hours" aria-live="polite">
      <span className="mc-contact-hours-icon"><Clock3/></span>
      <div className="mc-contact-hours-copy"><h2>Store Hours</h2>
        {settings.isLoading ? <div className="mc-hours-skeleton" aria-label="Loading store hours"/> :
          settings.isError ? <div className="mc-hours-error"><p>Store hours are temporarily unavailable.</p><button type="button" onClick={() => void settings.refetch()} disabled={settings.isFetching}>Try again</button></div> :
          settings.data?.store_hours?.trim() ? <p className="mc-hours-value">{settings.data.store_hours}</p> : <p className="mc-hours-unset">Hours will be shared here once confirmed.</p>}
      </div>
      <div className="mc-hours-bloom" aria-hidden="true"><Flower2/><span>Beauty<br/>in every<br/>moment</span></div>
    </section>
  </main>;
}
