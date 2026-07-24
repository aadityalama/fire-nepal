import Image from "next/image";

/** Premium 3D emerald glass vault + NPR coins + wealth growth for the Total Savings hero. */
export function EmeraldGlassVaultIllustration() {
  return (
    <Image
      src="/illustrations/savings-wealth-vault-3d.png"
      alt="Premium emerald glass vault with gold NPR coins and wealth growth"
      width={288}
      height={288}
      priority
      className="h-full w-full object-cover object-center"
      sizes="(max-width: 640px) 144px, 144px"
    />
  );
}
