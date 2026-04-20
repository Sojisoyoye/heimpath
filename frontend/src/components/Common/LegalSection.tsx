/**
 * Legal Section Component
 * Reusable section block for legal pages (Terms, Privacy, Imprint)
 */

interface IProps {
  title: string
  children: React.ReactNode
}

/******************************************************************************
                              Components
******************************************************************************/

/** Default component. Section with heading and content for legal pages. */
function LegalSection(props: IProps) {
  const { title, children } = props
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export { LegalSection }
