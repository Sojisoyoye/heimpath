import { Quote } from "lucide-react"
import { CONTACT_EMAIL } from "@/common/constants"
import { testimonials } from "@/data/testimonials"
import { AnimateIn } from "./AnimateIn"

/******************************************************************************
                              Components
******************************************************************************/

function TestimonialCard({
  quote,
  name,
  country,
  city,
  feature,
  month,
  isReal,
}: (typeof testimonials)[number]) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-6 shadow-sm">
      <Quote className="mb-4 h-6 w-6 shrink-0 text-primary/40" />
      <p className="flex-1 text-sm leading-relaxed text-card-foreground">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-5 flex items-center justify-between border-t pt-4">
        <div>
          <p className="text-sm font-medium">
            {country} {name}
          </p>
          <p className="text-xs text-muted-foreground">
            {city} · {feature}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{month}</p>
          {!isReal && (
            <p className="text-[10px] text-muted-foreground/60">
              ✦ Illustrative
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/** Testimonials grid — shows real quotes when available, illustrative ones until then. */
function TestimonialsSection() {
  const real = testimonials.filter((t) => t.isReal)
  const illustrative = testimonials.filter((t) => !t.isReal)
  const realCount = real.length
  const display = [...real, ...illustrative].slice(0, 3)
  const hasIllustrative = display.some((t) => !t.isReal)

  return (
    <section className="py-20 md:py-28" id="testimonials">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <AnimateIn>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              What Expats Say About HeimPath
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {realCount > 0
                ? `${realCount} verified user${realCount > 1 ? "s" : ""} sharing real outcomes.`
                : "Be among the first to share your HeimPath story."}
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {display.map((t, i) => (
            <AnimateIn key={i} delayMs={i * 80}>
              <TestimonialCard {...t} />
            </AnimateIn>
          ))}
        </div>

        {hasIllustrative && (
          <AnimateIn>
            <div className="mt-10 rounded-xl border border-dashed bg-muted/30 p-6 text-center">
              <p className="text-sm font-medium">
                Used HeimPath? Tell us what it saved you.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Some quotes above are illustrative — we&apos;re collecting real
                stories from our first users.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=HeimPath%20Testimonial`}
                className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Share your story →
              </a>
            </div>
          </AnimateIn>
        )}
      </div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { TestimonialsSection }
