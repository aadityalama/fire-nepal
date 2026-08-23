import { buildSipCalculatorJsonLd } from "@/lib/brand/sip-calculator-seo";

export function SipCalculatorJsonLd() {
  const graphs = buildSipCalculatorJsonLd();

  return (
    <>
      {graphs.map((graph) => (
        <script
          key={String(graph["@id"] ?? graph["@type"])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
      ))}
    </>
  );
}
