import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import {
  Scale,
  FileCheck,
  ShieldCheck,
  BrainCircuit,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Users,
  Search,
  Lock,
  Sparkles,
  Building2,
  Briefcase,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export function LandingPage() {
  const categories = [
    {
      title: "Consumer Protection",
      slug: "consumer-dispute",
      desc: "Defective goods, e-commerce refunds, service deficiency, builder delays under CPA 2019.",
      tag: "Consumer Forum",
    },
    {
      title: "Tenancy & Rental Disputes",
      slug: "tenancy-recovery",
      desc: "Security deposit withholding, illegal eviction notice, maintenance disputes, rent agreement breach.",
      tag: "Rent Authority",
    },
    {
      title: "Employment & Salary Arrears",
      slug: "employment-salary",
      desc: "Unpaid dues, wrongful termination, gratuity withholding, maternity benefit denial.",
      tag: "Labour Court",
    },
    {
      title: "Cyber Fraud & Digital Theft",
      slug: "cyber-fraud",
      desc: "UPI phishing, unauthorized bank debits, credit card skimming, identity theft reports.",
      tag: "Cyber Cell / Police",
    },
    {
      title: "Family & Maintenance",
      slug: "family-maintenance",
      desc: "Maintenance claims, domestic protection, mutual settlement chronology, custody records.",
      tag: "Family Court",
    },
    {
      title: "Commercial Debt Recovery",
      slug: "debt-recovery",
      desc: "Dishonoured cheques (NI Act Sec 138), unpaid vendor invoices, summary suits under Order 37.",
      tag: "Civil Court",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Narrate Your Story",
      desc: "Chat dynamically with our legal intake AI in Hindi or English, or record voice memos. The AI identifies key dates, parties, and damages.",
      icon: BrainCircuit,
    },
    {
      num: "02",
      title: "Upload Your Evidence",
      desc: "Drag and drop rental agreements, WhatsApp screenshots, invoices, or audio notes. Stored privately with cryptographic SHA-256 integrity.",
      icon: UploadCloud,
    },
    {
      num: "03",
      title: "Citizen Fact Verification",
      desc: "Review an AI-compiled chronological timeline. Confirm accurate claims, correct dates, and formally certify your dispute facts.",
      icon: CheckCircle2,
    },
    {
      num: "04",
      title: "Lawyer-Ready PDF Packet",
      desc: "Compile an executive LegalTech dossier complete with facts summary, claims chronology, evidence manifest, and tamper-evident hash.",
      icon: FileCheck,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-28 lg:pb-32 bg-gradient-to-b from-slate-100/80 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Trust Banner */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 mb-8 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Engineered for the Indian Judicial & Legal Aid Ecosystem</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-950 dark:text-white max-w-4xl mx-auto leading-[1.1]">
            Your Story. Organized. <br />
            <span className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 bg-clip-text text-transparent">
              Your Legal Journey, Simplified.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Turn disorganized receipts, WhatsApp screenshots, rental deeds, and audio notes into structured, source-linked, citizen-verified legal case packets ready for consultation with verified advocates.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="h-13 px-8 text-base bg-slate-900 text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 font-bold shadow-xl shadow-slate-950/10">
                Start Case Intake Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link to="/lawyers">
              <Button size="lg" variant="outline" className="h-13 px-8 text-base border-slate-300 dark:border-slate-700 font-semibold">
                <Search className="h-4 w-4 mr-2 text-amber-500" />
                Find Verified Advocate
              </Button>
            </Link>
          </div>

          {/* Three Pillars */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-center gap-3 text-slate-700 dark:text-slate-300">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-left">
                Zero-Trust Anti-IDOR <br />
                <span className="text-xs text-slate-500 font-normal">Strict citizen data isolation</span>
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 text-slate-700 dark:text-slate-300">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Lock className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-left">
                Tamper-Evident SHA-256 <br />
                <span className="text-xs text-slate-500 font-normal">Cryptographic dossier hashes</span>
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 text-slate-700 dark:text-slate-300">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Scale className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-left">
                BCI Enrolled Advocates <br />
                <span className="text-xs text-slate-500 font-normal">Verified Bar Council credentials</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Workflow Section */}
      <section id="features" className="py-24 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3 text-amber-600 border-amber-400/50">
              The NyayaPacket Workflow
            </Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              From Chaos to a Court-Ready Dossier
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400 text-base">
              Four structured milestones ensure your dispute facts are accurately compiled, verified by you, and actionable for your advocate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="relative flex flex-col p-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50 hover:shadow-lg transition-all hover:-translate-y-1 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-heading text-3xl font-extrabold text-slate-300 dark:text-slate-700">
                      {step.num}
                    </span>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-amber-400 group-hover:scale-110 transition-transform">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Case Categories Grid */}
      <section className="py-24 bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3 text-blue-600 border-blue-400/50">
              Dispute Archetypes
            </Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Structured Templates for Common Indian Disputes
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400 text-base">
              Each category features specialized AI questioning and statutory reference frameworks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Card key={cat.slug} className="hover:border-amber-400/50 hover:shadow-md transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="font-mono text-[11px]">
                      {cat.tag}
                    </Badge>
                    <Building2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <CardTitle className="text-xl">{cat.title}</CardTitle>
                  <CardDescription className="pt-1">{cat.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to={`/register?category=${cat.slug}`}>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-amber-600 dark:text-amber-400 font-semibold p-0 hover:bg-transparent">
                      Initiate this Dispute <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Advocate Network CTA */}
      <section className="py-20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 mb-4 border border-amber-500/30">
              <Briefcase className="h-4 w-4" /> For Practicing Advocates
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">
              Spend Time on Strategy, Not Sifting Paperwork.
            </h2>
            <p className="mt-4 text-slate-300 text-base leading-relaxed">
              Join NyayaPacket AI's verified advocate directory. Receive structured executive case packets with source-linked timelines, tamper hashes, and direct client consultation requests.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <Link to="/register?role=LAWYER">
              <Button size="lg" className="w-full sm:w-auto bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold shadow-lg">
                Register as Advocate
              </Button>
            </Link>
            <Link to="/lawyers">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-white border-slate-600 hover:bg-slate-800">
                View Directory
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <HelpCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
            <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white mb-2">
                Is NyayaPacket AI giving me legal advice?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                No. NyayaPacket AI is an objective factual organization and document indexing utility. It extracts dates, summarizes statements, and verifies file hashes. Formal legal advice and court representation are provided exclusively by Bar Council of India enrolled advocates whom you consult.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white mb-2">
                Who has access to my documents and evidence files?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Only you. We enforce zero-trust multi-tenant isolation. No advocate can view your case until you explicitly send them a consultation request and issue an Access Grant. You can revoke access at any second with a single click. Even platform administrators are blocked from viewing your legal evidence binaries.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
              <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white mb-2">
                What is a Tamper-Evident SHA-256 Hash?
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Every generated PDF Case Packet and evidence upload is stamped with a unique cryptographic SHA-256 fingerprint. This guarantees that neither party can alter the dossier without invalidating the cryptographic checksum.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
