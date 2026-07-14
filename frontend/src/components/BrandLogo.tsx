import { useState } from "react";
import { Link } from "react-router-dom";

type BrandLogoProps = {
  className?: string;
  /** Variante maior para o hero */
  size?: "header" | "hero";
};

/**
 * Logo da marca: tenta /brand/logo.png (1:5 transparente),
 * depois /brand/logo.svg (placeholder).
 */
export function BrandLogo({ className = "", size = "header" }: BrandLogoProps) {
  const [src, setSrc] = useState("/brand/logo.png");

  return (
    <Link to="/" className={`brand-logo brand-logo--${size} ${className}`.trim()}>
      <img
        src={src}
        alt="EducaMoney"
        className="brand-logo__img"
        onError={() => {
          if (src.endsWith("logo.png")) {
            setSrc("/brand/logo.svg");
          }
        }}
      />
    </Link>
  );
}
