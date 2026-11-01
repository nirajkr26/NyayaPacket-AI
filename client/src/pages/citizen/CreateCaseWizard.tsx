import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Scale,
  ShoppingBag,
  Home,
  Briefcase,
  ShieldAlert,
  Coins,
  HeartHandshake,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  UserPlus,
  Trash2,
  Calendar,
  MapPin,
  Sparkles,
} from "lucide-react";
import { api } from "../../lib/apiClient";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { cn } from "../../lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface PartyInput {
  name: string;
  relationship: string;
  organization: string;
  contactInfo: string;
  description: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  consumer: ShoppingBag,
  tenancy: Home,
  employment: Briefcase,
  cyber: ShieldAlert,
  financial: Coins,
  family: HeartHandshake,
  default: Scale,
};

export function CreateCaseWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [description, setDescription] = useState("");
  const [parties, setParties] = useState<PartyInput[]>([
    {
      name: "",
      relationship: "Opposing Party",
      organization: "",
      contactInfo: "",
      description: "",
    },
  ]);

  // Fetch active categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get<Category[]>("/categories");
      return res.data || [];
    },
  });

  const getCategoryIcon = (slug: string) => {
    for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
      if (slug.includes(key)) return icon;
    }
    return CATEGORY_ICONS.default;
  };

  const handleAddParty = () => {
    setParties([
      ...parties,
      {
        name: "",
        relationship: "Other Involved Party",
        organization: "",
        contactInfo: "",
        description: "",
      },
    ]);
  };

  const handleRemoveParty = (index: number) => {
    if (parties.length === 1) return;
    setParties(parties.filter((_, i) => i !== index));
  };

  const handlePartyChange = (index: number, field: keyof PartyInput, value: string) => {
    const updated = [...parties];
    updated[index] = { ...updated[index], [field]: value };
    setParties(updated);
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!selectedCategoryId) {
        setError("Please choose a dispute category to proceed.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!title.trim() || title.length < 5) {
        setError("Please enter a descriptive matter title (at least 5 characters).");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const validParties = parties.filter((p) => p.name.trim().length > 0);

    try {
      const res = await api.post("/cases", {
        categoryId: selectedCategoryId,
        title: title.trim(),
        description: description.trim() || undefined,
        incidentDate: incidentDate || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        parties: validParties.length > 0 ? validParties : undefined,
      });

      const newCaseId = res.data?.id;
      if (newCaseId) {
        navigate(`/dashboard/cases/${newCaseId}`);
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create case matter");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Stepper Progress */}
      <div className="p-4 rounded-xl glass-card border-border flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-semibold">
          {[
            { step: 1, label: "Category" },
            { step: 2, label: "Dispute Details" },
            { step: 3, label: "Involved Parties" },
            { step: 4, label: "Review & Start" },
          ].map((s) => (
            <div
              key={s.step}
              className={cn(
                "flex items-center gap-1.5",
                currentStep === s.step
                  ? "text-primary"
                  : currentStep > s.step
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  currentStep === s.step
                    ? "bg-primary text-primary-foreground"
                    : currentStep > s.step
                    ? "bg-emerald-600 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {currentStep > s.step ? "✓" : s.step}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        <Badge variant="secondary" className="text-xs">
          Step {currentStep} of 4
        </Badge>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
          {error}
        </div>
      )}

      {/* STEP 1: CATEGORY SELECTION */}
      {currentStep === 1 && (
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Select Dispute Category</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Choose the primary domain of your legal issue to customize the AI interview questions:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoriesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(categories || []).map((cat) => {
                  const Icon = getCategoryIcon(cat.slug);
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={cn(
                        "p-4 rounded-xl border text-left cursor-pointer transition-all duration-150 flex items-start gap-3.5",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-foreground">{cat.name}</h4>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {cat.description || "General legal dispute categorization."}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext} disabled={!selectedCategoryId} className="gap-2">
                Continue to Dispute Details <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: DISPUTE DETAILS */}
      {currentStep === 2 && (
        <Card className="glass-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="accent">{selectedCategory?.name}</Badge>
            </div>
            <CardTitle className="text-xl font-bold text-foreground">Dispute Overview</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Provide basic facts. You will provide in-depth chronology and evidence in the next steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Matter Title *</label>
              <Input
                placeholder="e.g. Unfair Security Deposit Deduction by Landlord at Indiranagar"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                A concise summary of the grievance or notice (minimum 5 characters).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Incident Date
                </label>
                <Input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> City / Forum
                </label>
                <Input
                  placeholder="e.g. Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">State</label>
                <Input
                  placeholder="e.g. Karnataka"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Initial Overview (Optional)</label>
              <Textarea
                placeholder="Briefly state what occurred, what loss was suffered, and what resolution or relief you seek..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={handleNext} disabled={!title.trim() || title.length < 5} className="gap-2">
                Continue to Involved Parties <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: INVOLVED PARTIES */}
      {currentStep === 3 && (
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Involved Parties</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Add details of the opposing person, company, landlord, or employer involved in this matter:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {parties.map((party, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span>Party #{index + 1}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {party.relationship}
                    </Badge>
                  </h4>
                  {parties.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveParty(index)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Party Name / Organization *</label>
                    <Input
                      placeholder="e.g. ABC Developers Pvt. Ltd. or John Doe"
                      value={party.name}
                      onChange={(e) => handlePartyChange(index, "name", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Role / Relationship</label>
                    <select
                      aria-label="Party Role / Relationship"
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      value={party.relationship}
                      onChange={(e) => handlePartyChange(index, "relationship", e.target.value)}
                    >
                      <option value="Opposing Party">Opposing Party</option>
                      <option value="Landlord">Landlord</option>
                      <option value="Employer">Employer</option>
                      <option value="Vendor / Merchant">Vendor / Merchant</option>
                      <option value="Bank / Financial Institution">Bank / Financial Institution</option>
                      <option value="Witness / Third Party">Witness / Third Party</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Organization (if applicable)</label>
                    <Input
                      placeholder="Company or Entity Name"
                      value={party.organization}
                      onChange={(e) => handlePartyChange(index, "organization", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Contact Info (Phone / Email)</label>
                    <Input
                      placeholder="Phone or official email"
                      value={party.contactInfo}
                      onChange={(e) => handlePartyChange(index, "contactInfo", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed border-border gap-1.5 text-xs"
              onClick={handleAddParty}
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Another Involved Party
            </Button>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button onClick={handleNext} className="gap-2">
                Review & Confirm <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: REVIEW & LAUNCH */}
      {currentStep === 4 && (
        <Card className="glass-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <Badge variant="accent">Ready to Initialize</Badge>
            </div>
            <CardTitle className="text-xl font-bold text-foreground">Review & Start AI Intake</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Confirm your case details. Once created, our AI legal assistant will guide you through evidence
              synthesis and chronological timeline generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Summary card */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Matter Category
                  </span>
                  <p className="text-sm font-bold text-foreground">{selectedCategory?.name}</p>
                </div>
                <Badge variant="secondary">{city ? `${city}, ${state || "India"}` : "National"}</Badge>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Matter Title
                </span>
                <p className="text-sm font-semibold text-foreground">{title}</p>
              </div>

              {incidentDate && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Approx. Incident Date
                  </span>
                  <p className="text-xs text-foreground">{incidentDate}</p>
                </div>
              )}

              {description && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Initial Statement
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Involved Parties ({parties.filter((p) => p.name).length})
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parties
                    .filter((p) => p.name)
                    .map((p, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {p.name} ({p.relationship})
                      </Badge>
                    ))}
                </div>
              </div>
            </div>

            {/* Zero-Trust Notice */}
            <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2.5">
              <Scale className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                By initiating this case, an isolated cryptographic ledger and private S3 bucket will be allocated. No
                third parties or advocates can inspect your evidence until you explicitly grant access.
              </span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setCurrentStep(3)} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                variant="default"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                className="gap-2 font-bold shadow-md"
              >
                Launch AI Intake Interview <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
