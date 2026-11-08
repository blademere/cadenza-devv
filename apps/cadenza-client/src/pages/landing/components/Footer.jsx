import { appConfig } from "@/config";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const copyrightYear =
    currentYear > appConfig.copyright.startYear
      ? `${appConfig.copyright.startYear}–${currentYear}`
      : currentYear;

  return (
    <footer className="mt-16 border-t bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          © {copyrightYear} {appConfig.office.name}, {appConfig.name}. All
          rights reserved.
        </p>

        <div className="flex gap-4 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground">
            Privacy
          </a>

          <a href="#" className="hover:text-foreground">
            Terms
          </a>

          <a href="#" className="hover:text-foreground">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
