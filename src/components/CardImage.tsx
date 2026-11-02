import Image from "next/image";
import type { Card } from "@/lib/card";

export function CardImage({
  card,
  sizes,
  large = false,
  priority = false,
}: {
  card: Card;
  sizes: string;
  large?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={large ? card.images.large : card.images.small}
      alt={`${card.name} card from ${card.set.name}`}
      width={large ? 734 : 245}
      height={large ? 1024 : 342}
      sizes={sizes}
      priority={priority}
      className="h-auto w-full rounded-[4.5%/3.2%]"
    />
  );
}
