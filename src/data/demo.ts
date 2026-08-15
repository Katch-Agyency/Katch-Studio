import type { Project } from "@/types";
import { createProjectFromTemplate } from "@/lib/projectFactory";
import { DEMO_IMAGES } from "@/data/templates";

/* ============================================================
   Demo data — realistic seed projects for the Katch workspace.
   Built through the exact same factory the New Project flow
   uses, so demos never drift from real project structure.
   ============================================================ */

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export function buildDemoProjects(): Project[] {
  /* ---------------- 1. Looky Cakes — Elegant Restaurant ---------------- */
  const looky = createProjectFromTemplate({
    templateId: "tpl-rest-elegant",
    name: "Looky Cakes",
    client: "Looky Cakes",
    category: "restaurant",
    description: "Premium patisserie and dessert boutique in Mohandiseen, Cairo.",
    audience: "Families, couples and dessert lovers across Greater Cairo",
    language: "en",
    status: "in_progress",
    brand: {
      businessName: "Looky Cakes",
      tagline: "Sweet moments, crafted daily",
      description:
        "Looky Cakes is a premium patisserie in the heart of Mohandiseen. Every dessert is baked fresh daily with fine Belgian chocolate, real butter and a lot of love.",
      logoText: "Looky Cakes",
      email: "hello@lookycakes.com",
      phone: "+20 100 254 7896",
      whatsapp: "+20 100 254 7896",
      address: "32 Gameat El Dowal St., Mohandiseen, Giza",
      social: [
        { label: "Instagram", url: "https://instagram.com" },
        { label: "Facebook", url: "https://facebook.com" },
      ],
    },
    content: {
      announcement: { text: "Order before 4 PM for same-day delivery across Cairo 🎂" },
      hero: {
        title: "Cakes that make moments unforgettable",
        subtitle: "Premium patisserie · Est. 2019",
        description:
          "Handcrafted cakes, macarons and desserts baked fresh every morning in Mohandiseen. Order online or visit our boutique for a taste of something sweet.",
        primaryCTA: { label: "Explore the Menu", href: "#menu", variant: "primary" },
        secondaryCTA: { label: "Order on WhatsApp", href: "https://wa.me/201002547896", variant: "secondary" },
        image: DEMO_IMAGES.cakesHero,
        imageAlt: "Signature chocolate cake",
        alignment: "left",
      },
      about: {
        title: "About Looky Cakes",
        subtitle: "Our story",
        text: "What started as a home kitchen in 2019 is now one of Mohandiseen's most loved patisseries. We believe a cake is more than dessert — it's the centerpiece of your celebration.",
        image: DEMO_IMAGES.gallery2,
        imageAlt: "Wedding cake in our boutique",
        points: ["Fresh-baked every morning", "Belgian chocolate & real butter", "Custom cakes for every occasion"],
      },
      menu: {
        title: "Our Menu",
        subtitle: "Baked fresh daily",
        categories: [
          {
            name: "Signature Cakes",
            items: [
              { name: "Chocolate Ganache Cake", description: "Dark Belgian chocolate, hazelnut praline.", price: "450 EGP" },
              { name: "Lotus Biscoff Cake", description: "Vanilla sponge, Biscoff cream, caramel drizzle.", price: "420 EGP" },
              { name: "Berry Cheesecake", description: "Baked cheesecake with fresh seasonal berries.", price: "380 EGP" },
            ],
          },
          {
            name: "Desserts & Macarons",
            items: [
              { name: "Macaron Box (12 pcs)", description: "Rotating flavors — pistachio, rose, chocolate.", price: "240 EGP" },
              { name: "Molten Lava Cake", description: "Served warm with vanilla ice cream.", price: "95 EGP" },
              { name: "Kunafa Cup", description: "Crispy kunafa, cream, honey syrup.", price: "85 EGP" },
            ],
          },
          {
            name: "Drinks",
            items: [
              { name: "Spanish Latte", description: "Double shot, condensed milk, our house blend.", price: "75 EGP" },
              { name: "Iced Matcha", description: "Ceremonial matcha, oat or whole milk.", price: "90 EGP" },
              { name: "Fresh Orange Juice", description: "Squeezed to order.", price: "60 EGP" },
            ],
          },
        ],
      },
      stats: {
        items: [
          { value: "5+", label: "Years of baking" },
          { value: "40k+", label: "Cakes delivered" },
          { value: "4.9★", label: "Google rating" },
          { value: "120+", label: "Custom orders / month" },
        ],
      },
      gallery: {
        title: "Gallery",
        subtitle: "A taste of what we do",
        images: [
          { src: DEMO_IMAGES.gallery1, alt: "Pastel macarons" },
          { src: DEMO_IMAGES.gallery2, alt: "Custom wedding cake" },
          { src: DEMO_IMAGES.gallery3, alt: "Molten lava cake" },
          { src: DEMO_IMAGES.cakesHero, alt: "Chocolate ganache cake" },
          { src: DEMO_IMAGES.cafeInterior, alt: "Our boutique" },
          { src: DEMO_IMAGES.fineDining, alt: "Plated dessert" },
        ],
      },
      testimonials: {
        title: "What Our Customers Say",
        subtitle: "Reviews from happy celebrations",
        items: [
          { name: "Sara Adel", role: "Birthday order", quote: "The custom cake was even more beautiful than the photo. Everyone at the party asked where it was from!", rating: 5 },
          { name: "Omar Khaled", role: "Regular customer", quote: "Best macarons in Cairo, hands down. The Lotus cake is dangerously good.", rating: 5 },
          { name: "Mariam Samy", role: "Wedding cake", quote: "They handled our wedding cake with so much care. Flawless delivery and incredible taste.", rating: 5 },
        ],
      },
      reservation: {
        title: "Reserve a Table",
        subtitle: "Visit the boutique",
        note: "Book a table for afternoon dessert or order a custom cake — message us on WhatsApp at +20 100 254 7896 and we'll reply within minutes.",
      },
      location: {
        title: "Find Us",
        subtitle: "In the heart of Mohandiseen",
        hours: [
          "Saturday – Thursday · 10:00 – 23:00",
          "Friday · 12:00 – 23:00",
          "Delivery · Cairo & Giza, 11:00 – 22:00",
        ],
        mapQuery: "Mohandiseen, Giza, Egypt",
      },
      cta: {
        title: "Craving something sweet?",
        text: "Order now and get same-day delivery across Cairo & Giza.",
        primaryCTA: { label: "Order on WhatsApp", href: "https://wa.me/201002547896", variant: "primary" },
        secondaryCTA: { label: "Explore the Menu", href: "#menu", variant: "secondary" },
      },
      contact: {
        title: "Get in Touch",
        subtitle: "We'd love to hear from you",
        info: {
          email: "hello@lookycakes.com",
          phone: "+20 100 254 7896",
          whatsapp: "+20 100 254 7896",
          address: "32 Gameat El Dowal St., Mohandiseen, Giza",
          hours: ["Saturday – Thursday · 10:00 – 23:00", "Friday · 12:00 – 23:00"],
        },
      },
      footer: {
        text: "© 2026 Looky Cakes. All rights reserved. Sweet moments, crafted daily.",
      },
    },
  });
  looky.updatedAt = hoursAgo(2);

  /* ---------------- 2. Bta3 7awa4y — Modern Food (Arabic, RTL) ---------------- */
  const hawa4y = createProjectFromTemplate({
    templateId: "tpl-rest-modern",
    name: "Bta3 7awa4y",
    client: "Bta3 7awa4y",
    category: "restaurant",
    description: "شبكة مطاعم حواوشي مصرية — خدمة سريعة وطعم أصيل.",
    audience: "الشباب والعائلات في القاهرة الكبرى",
    language: "ar",
    status: "delivered",
    brand: {
      businessName: "Bta3 7awa4y",
      tagline: "الحواوشي على أصوله",
      description:
        "من أول فرن صغير لحد النهارده، إحنا بنقدم أشهر حواوشي في مصر. عيش بلدي طازة، لحمة بلدي مفرومة يوميًا، وتتبيلة سرية محدش يعرفها غيرنا.",
      logoText: "Bta3 7awa4y",
      email: "orders@bta3hawa4y.com",
      phone: "+20 102 887 5544",
      whatsapp: "+20 102 887 5544",
      address: "١٥ شارع جامعة الدول العربية، المهندسين، الجيزة",
      social: [
        { label: "Instagram", url: "https://instagram.com" },
        { label: "Facebook", url: "https://facebook.com" },
      ],
    },
    content: {
      announcement: { text: "عرض الجمعة — وجبة حواوشي + بطاطس + مشروب بـ ١٤٩ جنيه 🔥" },
      hero: {
        title: "أشهى حواوشي في مصر",
        subtitle: "لحمة بلدي · عيش طازة · تتبيلة سرية",
        description:
          "حواشي على أصوله، بيتعمل قدامك على فرن بلدي. اطلب أونلاين أو تعالى أقرب فرع — الطعم يستاهل المشوار.",
        primaryCTA: { label: "اطلب دلوقتي", href: "https://wa.me/201028875544", variant: "primary" },
        secondaryCTA: { label: "شوف المنيو", href: "#menu", variant: "secondary" },
        image: DEMO_IMAGES.hawawshi,
        imageAlt: "حواوشي لحمة بلدي",
        alignment: "left",
      },
      about: {
        title: "حكاية Bta3 7awa4y",
        subtitle: "من ٢٠١٨ لحد النهارده",
        text: "بدأنا بفرن واحد في المهندسين، والنهارده عندنا فروع في القاهرة والجيزة. السر مش بس في التتبيلة — السر في إننا بنتعامل مع كل زبون كأنه ضيف في بيتنا.",
        image: DEMO_IMAGES.hawawshi,
        imageAlt: "حواوشي من الفرن",
        points: ["لحمة بلدي مفرومة يوميًا", "عيش بلدي طازة من الفرن", "توصيل سريع في القاهرة والجيزة"],
      },
      menu: {
        title: "المنيو",
        subtitle: "كله طازة وبيتعمل دلوقتي",
        categories: [
          {
            name: "الحواوشي",
            items: [
              { name: "حواوشي لحمة بلدي", description: "لحمة مفرومة، فلفل حار، وتتبيلة سرية.", price: "95 جنيه" },
              { name: "حواوشي سجق بلدي", description: "سجق بلدي مع بصل وفلفل ألوان.", price: "85 جنيه" },
              { name: "حواوشي فراخ", description: "صدور فراخ متبلة بخلطة البيت.", price: "80 جنيه" },
              { name: "حواوشي مشكل", description: "لحمة + سجق + جبنة موتزاريلا.", price: "110 جنيه" },
            ],
          },
          {
            name: "الإضافات",
            items: [
              { name: "بطاطس محمرة", description: "مقرمشة مع رشة بهارات البيت.", price: "30 جنيه" },
              { name: "مخلل بلدي", description: "خيار وجزر ولفت على أصوله.", price: "15 جنيه" },
              { name: "سلطة طحينة", description: "طحينة وسلطة بلدي طازة.", price: "20 جنيه" },
            ],
          },
          {
            name: "المشروبات",
            items: [
              { name: "شاي بلدي", description: "بالنعناع الفريش.", price: "15 جنيه" },
              { name: "عصير مانجو", description: "مانجو طازة ١٠٠٪.", price: "45 جنيه" },
              { name: "مياه غازية", description: "كولا، سبرايت، فانتا.", price: "20 جنيه" },
            ],
          },
        ],
      },
      stats: {
        items: [
          { value: "٧+", label: "سنين خبرة" },
          { value: "٥", label: "فروع في مصر" },
          { value: "٥٠٠ ألف+", label: "حواوشي اتباع" },
          { value: "٤٫٨★", label: "تقييم جوجل" },
        ],
      },
      gallery: {
        title: "معرض الصور",
        subtitle: "من فرننا لقلبك",
        images: [
          { src: DEMO_IMAGES.hawawshi, alt: "حواوشي لحمة" },
          { src: DEMO_IMAGES.fineDining, alt: "طبق تقديم" },
          { src: DEMO_IMAGES.gallery1, alt: "حلويات" },
          { src: DEMO_IMAGES.gallery3, alt: "حواوشي بالسمنة" },
        ],
      },
      testimonials: {
        title: "آراء عملائنا",
        subtitle: "الكلام اللي بيخلينا نكمل",
        items: [
          { name: "أحمد مصطفى", role: "زبون دايم", quote: "أحسن حواوشي دقته في حياتي. التتبيلة دي سر والله!", rating: 5 },
          { name: "منى حسن", role: "زبونة", quote: "التوصيل وصل سخن وفي المعاد بالظبط. العيش طازة فعلًا.", rating: 5 },
          { name: "كريم فتحي", role: "زبون", quote: "الحواوشي المشكل تحفة. بقيت بطلب منهم كل أسبوع.", rating: 5 },
        ],
      },
      reservation: {
        title: "اطلب من أقرب فرع",
        subtitle: "أو خليه يجيلك لحد البيت",
        note: "اطلب أونلاين عن طريق واتساب على رقم 0102 887 5544، أو كلمنا والحجز هيوصل في ٣٠ دقيقة.",
      },
      location: {
        title: "فروعنا",
        subtitle: "الأقرب ليك",
        hours: [
          "كل يوم · ١٢:٠٠ ظهرًا – ٢:٠٠ بعد منتصف الليل",
          "التوصيل · القاهرة والجيزة",
        ],
        mapQuery: "Mohandiseen, Giza, Egypt",
      },
      cta: {
        title: "جعت؟ إحنا جاهزين",
        text: "اطلب دلوقتي ووصلك الحواوشي سخن لحد باب البيت.",
        primaryCTA: { label: "اطلب على واتساب", href: "https://wa.me/201028875544", variant: "primary" },
        secondaryCTA: { label: "شوف المنيو", href: "#menu", variant: "secondary" },
      },
      contact: {
        title: "كلمنا",
        subtitle: "أي سؤال أو اقتراح — إحنا موجودين",
        info: {
          email: "orders@bta3hawa4y.com",
          phone: "+20 102 887 5544",
          whatsapp: "+20 102 887 5544",
          address: "١٥ شارع جامعة الدول العربية، المهندسين، الجيزة",
          hours: ["كل يوم · ١٢:٠٠ ظهرًا – ٢:٠٠ بعد منتصف الليل"],
        },
      },
      footer: {
        text: "© ٢٠٢٦ Bta3 7awa4y. كل الحقوق محفوظة — الحواوشي على أصوله.",
      },
    },
  });
  hawa4y.updatedAt = hoursAgo(30);

  /* ---------------- 3. Katch Portfolio — Creative Agency ---------------- */
  const katch = createProjectFromTemplate({
    templateId: "tpl-biz-agency",
    name: "Katch Agency Site",
    client: "Katch",
    category: "business",
    description: "Official website for the Katch creative agency.",
    audience: "SMEs and startups across Egypt and the Middle East",
    language: "en",
    status: "review",
    brand: {
      businessName: "Katch",
      tagline: "Websites that catch attention",
      description:
        "Katch is a Cairo-based web agency helping brands stand out online. We design, build and launch high-performance websites — fast.",
      logoText: "Katch",
      email: "hello@katch.agency",
      phone: "+20 100 111 2233",
      whatsapp: "+20 100 111 2233",
      address: "New Cairo, Cairo, Egypt",
      social: [
        { label: "Instagram", url: "https://instagram.com" },
        { label: "LinkedIn", url: "https://linkedin.com" },
        { label: "Behance", url: "https://behance.net" },
      ],
    },
    content: {
      announcement: { text: "Now booking projects for Q4 2026 — 2 slots left" },
      hero: {
        title: "Websites that catch attention",
        subtitle: "Design · Development · Growth",
        description:
          "Katch is a Cairo-based web agency building high-performance websites for ambitious brands. From first sketch to launch — we've got you.",
        primaryCTA: { label: "Start a Project", href: "#contact", variant: "primary" },
        secondaryCTA: { label: "See Our Work", href: "#projects", variant: "secondary" },
        image: DEMO_IMAGES.portfolioWork,
        imageAlt: "Katch studio workspace",
        alignment: "left",
      },
      clients: {
        title: "Trusted by ambitious brands",
        subtitle: "Clients we've worked with",
        logos: ["Looky Cakes", "Bta3 7awa4y", "NileTech", "CairoFit", "Horus Labs"],
      },
      services: {
        title: "What we do",
        subtitle: "Everything your brand needs to win online",
        items: [
          { icon: "palette", title: "Web Design", text: "Interfaces that feel premium and convert visitors into customers." },
          { icon: "code", title: "Development", text: "Fast, maintainable builds with React, Next.js and modern tooling." },
          { icon: "megaphone", title: "Brand Identity", text: "Logos, typography and visual systems that make you memorable." },
          { icon: "trending-up", title: "SEO & Performance", text: "Sites that load instantly and rank where your customers search." },
          { icon: "shopping-bag", title: "E-commerce", text: "Online stores built to sell — from catalog to checkout." },
          { icon: "headphones", title: "Care & Support", text: "We stay after launch with updates, monitoring and improvements." },
        ],
      },
      projects: {
        title: "Selected Work",
        subtitle: "Recent launches",
        items: [
          { title: "Looky Cakes", category: "Restaurant Website", image: DEMO_IMAGES.cakesHero },
          { title: "Bta3 7awa4y", category: "Food Brand", image: DEMO_IMAGES.hawawshi },
          { title: "NileTech SaaS", category: "Product Landing", image: DEMO_IMAGES.landingDashboard },
        ],
      },
      stats: {
        items: [
          { value: "60+", label: "Projects delivered" },
          { value: "98%", label: "Client retention" },
          { value: "2.1s", label: "Avg. load time" },
          { value: "14", label: "Industries served" },
        ],
      },
      process: {
        title: "How we work",
        subtitle: "A process that ships",
        steps: [
          { title: "Discover", text: "We dig into your business, audience and goals." },
          { title: "Design", text: "Wireframes to polished UI — you approve every step." },
          { title: "Build", text: "Clean, fast development with weekly demos." },
          { title: "Launch & Grow", text: "We ship, monitor and optimize what matters." },
        ],
      },
      caseStudies: {
        title: "Case Studies",
        subtitle: "Results that speak",
        items: [
          { client: "Looky Cakes", title: "Restaurant website", result: "+62% online orders in 60 days" },
          { client: "Bta3 7awa4y", title: "Brand + ordering site", result: "3× WhatsApp orders after launch" },
          { client: "NileTech", title: "Product landing page", result: "2.4× signup conversion" },
        ],
      },
      team: {
        title: "The Team",
        subtitle: "Small team, big output",
        members: [
          { name: "Youssef Hassan", role: "Founder & Creative Director", image: "" },
          { name: "Lina Maher", role: "Head of Design", image: "" },
          { name: "Mohamed Adel", role: "Lead Developer", image: "" },
        ],
      },
      testimonials: {
        title: "What clients say",
        subtitle: "Reviews that keep us going",
        items: [
          { name: "Looky Cakes team", role: "Restaurant", quote: "Katch understood our brand instantly. The site paid for itself in the first month.", rating: 5 },
          { name: "Bta3 7awa4y", role: "Food brand", quote: "Fast, professional, and the WhatsApp ordering flow doubled our orders.", rating: 5 },
          { name: "NileTech", role: "SaaS", quote: "From brief to launch in three weeks. Unheard of.", rating: 5 },
        ],
      },
      cta: {
        title: "Let's build your website",
        text: "Tell us about your project — we'll reply within one business day.",
        primaryCTA: { label: "Start a Project", href: "#contact", variant: "primary" },
        secondaryCTA: { label: "WhatsApp Us", href: "https://wa.me/201001112233", variant: "secondary" },
      },
      contact: {
        title: "Get in Touch",
        subtitle: "Project in mind? We're listening.",
        info: {
          email: "hello@katch.agency",
          phone: "+20 100 111 2233",
          whatsapp: "+20 100 111 2233",
          address: "New Cairo, Cairo, Egypt",
          hours: ["Sunday – Thursday · 09:00 – 18:00"],
        },
      },
      footer: {
        text: "© 2026 Katch Agency. Built with Katch Studio.",
      },
    },
  });
  katch.updatedAt = hoursAgo(26);

  return [looky, hawa4y, katch];
}
