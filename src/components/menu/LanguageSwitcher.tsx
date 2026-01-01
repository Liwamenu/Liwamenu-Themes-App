import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLanguage } from '@/lib/i18n';
import type { Country } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';

// Map language codes to country codes for flags
const languages: { code: string; label: string; countryCode: Country }[] = [
  { code: 'tr', label: 'Türkçe', countryCode: 'TR' },
  { code: 'en', label: 'English', countryCode: 'GB' },
  { code: 'de', label: 'Deutsch', countryCode: 'DE' },
  { code: 'fr', label: 'Français', countryCode: 'FR' },
  { code: 'it', label: 'Italiano', countryCode: 'IT' },
  { code: 'es', label: 'Español', countryCode: 'ES' },
  { code: 'ar', label: 'العربية', countryCode: 'SA' },
  { code: 'az', label: 'Azərbaycan', countryCode: 'AZ' },
  { code: 'ru', label: 'Русский', countryCode: 'RU' },
  { code: 'el', label: 'Ελληνικά', countryCode: 'GR' },
  { code: 'zh', label: '中文', countryCode: 'CN' },
];

// Flag component using react-phone-number-input flags
function CountryFlag({ country }: { country: Country }) {
  const FlagComponent = flags[country];
  if (!FlagComponent) return null;
  return (
    <span className="inline-flex w-5 h-4 overflow-hidden rounded-[2px] shrink-0">
      <FlagComponent title={country} />
    </span>
  );
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    changeLanguage(langCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Globe className="w-4 h-4" />
          <CountryFlag country={currentLang.countryCode} />
          <span className="text-sm">{currentLang.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`cursor-pointer ${i18n.language === lang.code ? 'bg-accent' : ''}`}
          >
            <CountryFlag country={lang.countryCode} />
            <span className="ml-2">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
