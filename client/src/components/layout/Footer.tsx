import { Scale, ShieldCheck, HeartHandshake, Lock } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-amber-400 dark:bg-slate-800">
                <Scale className="h-4 w-4" />
              </div>
              <span className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                NyayaPacket AI
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Empowering Indian citizens with verifiable, source-linked case dossiers.
              Turning messy personal narratives into structured facts, evidence timelines,
              and lawyer-ready legal packets under the Indian legal framework.
            </p>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Anti-IDOR Zero Trust
              </span>
              <span className="flex items-center gap-1">
                <Lock className="h-4 w-4 text-amber-500" />
                SHA-256 Tamper Evident
              </span>
              <span className="flex items-center gap-1">
                <HeartHandshake className="h-4 w-4 text-blue-500" />
                Bar Verified Advocates
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-4">
              Dispute Categories
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                  Consumer Protection Disputes
                </span>
              </li>
              <li>
                <span className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                  Tenancy & Rental Recovery
                </span>
              </li>
              <li>
                <span className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                  Employment & Salary Arrears
                </span>
              </li>
              <li>
                <span className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                  Cyber Fraud & Unauthorized Transactions
                </span>
              </li>
            </ul>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-4">
              Advocates & Legal Aid
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/lawyers" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                  Advocate Directory
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                  Advocate Onboarding
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                  Citizen Portal Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Statutory Legal Disclaimer Banner */}
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 text-xs text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300 leading-relaxed">
          <p className="font-semibold mb-1 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Statutory Legal Notice & Disclaimer:
          </p>
          NyayaPacket AI is an algorithmic case organization, chronology compilation, and document dossier preparation utility. NyayaPacket AI does not provide formal legal representation, solicit legal cases, or dispense judicial advice. Case packets compiled by citizens are meant solely for presentation to an advocate duly enrolled with the Bar Council of India under the Advocates Act, 1961.
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-900 pt-6">
          <p>© {new Date().getFullYear()} NyayaPacket AI. Engineered for Indian Justice Ecosystem.</p>
          <div className="flex items-center gap-4 mt-2 sm:mt-0">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
