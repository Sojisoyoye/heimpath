/******************************************************************************
                              Constants
******************************************************************************/

const WEBP_SRCSET = [
  "/images/hero-couple-keys-640w.webp 640w",
  "/images/hero-couple-keys-1024w.webp 1024w",
  "/images/hero-couple-keys-1280w.webp 1280w",
].join(", ")

const JPEG_SRCSET = [
  "/images/hero-couple-keys-640w.jpg 640w",
  "/images/hero-couple-keys-1024w.jpg 1024w",
  "/images/hero-couple-keys-1280w.jpg 1280w",
].join(", ")

const SIZES = "(min-width: 1024px) 400px, (min-width: 768px) 320px, 100vw"

/******************************************************************************
                              Components
******************************************************************************/

/** Responsive hero photograph with WebP + JPEG fallback. */
function HeroPhoto() {
  return (
    <picture>
      <source type="image/webp" srcSet={WEBP_SRCSET} sizes={SIZES} />
      <source type="image/jpeg" srcSet={JPEG_SRCSET} sizes={SIZES} />
      <img
        src="/images/hero-couple-keys-1024w.jpg"
        sizes={SIZES}
        alt="International couple receiving keys to their new home in Germany"
        width={1280}
        height={853}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="rounded-2xl object-cover shadow-xl dark:brightness-90"
      />
    </picture>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { HeroPhoto }
