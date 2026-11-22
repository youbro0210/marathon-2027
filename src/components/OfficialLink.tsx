import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OfficialLink({
  href,
  name,
  official = true,
  className,
}: {
  href: string;
  name: string;
  official?: boolean;
  className?: string;
}) {
  const label = official ? "공식 접수 사이트" : "공고 페이지";
  return (
    <Button asChild className={cn("h-12 px-4 text-base", className)}>
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${name} ${label}, 새 탭에서 열림`}>
        {label}
        <ExternalLink aria-hidden="true" />
      </a>
    </Button>
  );
}
