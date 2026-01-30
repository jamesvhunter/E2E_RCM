import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Background grid */}
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      
      {/* Gradient orbs */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/freed-logo.svg"
                alt="Freed RCM"
                width={160}
                height={32}
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-xs">
                v0.1.0 Beta
              </Badge>
              <Link href="/dashboard">
                <Button size="sm">
                  Open Dashboard
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="container mx-auto px-6 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 px-4 py-1.5 text-sm" variant="secondary">
              AI-Native Revenue Cycle Management
            </Badge>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="text-gradient">Intelligent</span> claims
              <br />
              from encounter to payment
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              An AI-native Practice Management system that transforms
              clinical documentation into billing-grade claims, automatically.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="glow-primary">
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                View Documentation
              </Button>
            </div>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Zap}
              title="AI-Powered Coding"
              description="Automatically suggest CPT, ICD-10, and modifier codes with confidence scoring and human-in-the-loop review."
            />
            <FeatureCard
              icon={Shield}
              title="Stedi EDI Integration"
              description="Real-time eligibility checks, 837P claim submission, and automatic ERA (835) posting to your ledger."
            />
            <FeatureCard
              icon={BarChart3}
              title="Event-Sourced Ledger"
              description="Immutable financial records with full audit trails. Balances are derived, never stored."
            />
          </div>
        </section>

        {/* Workflow Steps */}
        <section className="container mx-auto px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              End-to-End Revenue Cycle
            </h2>
            
            <div className="space-y-8">
              <WorkflowStep
                number="01"
                title="Patient Intake & Eligibility"
                description="Capture demographics, insurance coverage, and verify benefits in real-time via Stedi 270/271."
                status="Phase 1"
              />
              <WorkflowStep
                number="02"
                title="AI Charge Capture"
                description="Transform clinical encounters into billing-grade service lines with AI-powered code suggestions."
                status="Phase 2"
              />
              <WorkflowStep
                number="03"
                title="Claim Submission"
                description="Assemble 837P claims with validation, submit via Stedi, and track through adjudication."
                status="Phase 4"
              />
              <WorkflowStep
                number="04"
                title="Remittance & Posting"
                description="Automatically ingest 835 ERAs, post payments and adjustments, and compute patient responsibility."
                status="Phase 5"
              />
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="container mx-auto px-6 py-16">
          <div className="border border-border rounded-2xl p-8 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-6 text-center">Built With</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                "Next.js 15",
                "TypeScript",
                "Supabase",
                "tRPC",
                "Tailwind CSS",
                "Stedi",
                "OpenAI",
                "Inngest",
              ].map((tech) => (
                <Badge key={tech} variant="secondary" className="text-sm px-4 py-1">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 py-24 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">
              Ready to streamline your revenue cycle?
            </h2>
            <p className="text-muted-foreground mb-8">
              Freed RCM is currently in development. This prototype demonstrates
              the core architecture for AI-native medical billing.
            </p>
            <Link href="/dashboard">
              <Button size="lg" className="glow-primary">
                Open Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Image
                src="/freed-icon.png"
                alt="Freed RCM"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <span>Freed RCM</span>
              <span>·</span>
              <span>AI-Native Practice Management</span>
            </div>
            <div className="text-sm text-muted-foreground">
              High-fidelity prototype · Not for production use
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="group p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  description,
  status,
}: {
  number: string;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="flex gap-6">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-mono font-bold text-sm">
          {number}
        </div>
      </div>
      <div className="flex-1 pb-8 border-b border-border last:border-0">
        <div className="flex items-center gap-3 mb-2">
          <h4 className="font-semibold">{title}</h4>
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
