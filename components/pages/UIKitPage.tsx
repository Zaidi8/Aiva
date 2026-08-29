'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  TriangleAlert,
  Users,
  XCircle,
} from 'lucide-react';

import { PageHeader } from '../ui/page-header';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { StatusBadge } from '../ui/status-badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { SectionCard } from '../ui/section-card';
import { StatCard } from '../ui/stat-card';
import { EmptyState } from '../ui/empty-state';
import { FormField } from '../ui/form-field';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Spinner } from '../ui/spinner';
import { Skeleton } from '../ui/skeleton';

interface UIKitPageProps {
  onNavigate?: (page: string) => void;
}

const swatches = [
  { name: 'Primary', sub: 'indigo-600', className: 'bg-primary' },
  { name: 'Primary hover', sub: 'indigo-700', className: 'bg-primary-hover' },
  { name: 'Teal accent', sub: 'teal-600', className: 'bg-brand-teal' },
  { name: 'Success', sub: 'emerald-600', className: 'bg-success' },
  { name: 'Warning', sub: 'amber-600', className: 'bg-warning' },
  { name: 'Destructive', sub: 'red-600', className: 'bg-destructive' },
  { name: 'Info', sub: 'sky-600', className: 'bg-info' },
  { name: 'Sidebar', sub: 'indigo-950', className: 'bg-sidebar' },
];

export function UIKitPage(_props: UIKitPageProps) {
  const [notify, setNotify] = useState(true);
  const [agree, setAgree] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-10 p-8">
        <PageHeader
          icon={<Sparkles />}
          title="Design System"
          description="Aiva component library — clinical indigo on slate, comfortable density."
          actions={
            <Button>
              <Plus />
              New component
            </Button>
          }
        />

        {/* Color tokens */}
        <SectionCard
          title="Color tokens"
          description="Semantic colors drive every component — no hardcoded hex."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {swatches.map((s) => (
              <div key={s.name} className="space-y-2">
                <div
                  className={`h-16 rounded-lg border border-border/60 shadow-xs ${s.className}`}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Typography */}
        <SectionCard title="Typography" description="Geist Sans · tracked headings">
          <div className="space-y-3">
            <h1>Heading 1 — Appointments overview</h1>
            <h2>Heading 2 — Today&apos;s schedule</h2>
            <h3>Heading 3 — Section title</h3>
            <p className="text-foreground">
              Body text at 14px with comfortable 1.6 line height for dense
              clinical dashboards that still breathe.
            </p>
            <p className="text-sm text-muted-foreground">
              Muted secondary text — timestamps, hints, and metadata.
            </p>
          </div>
        </SectionCard>

        {/* Stat cards */}
        <section className="space-y-4">
          <h2>Metrics</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Appointments today"
              value="24"
              icon={<Calendar />}
              accent="primary"
              trend={{ value: '12%', direction: 'up' }}
              hint="vs last week"
            />
            <StatCard
              label="Active patients"
              value="1,284"
              icon={<Users />}
              accent="teal"
              trend={{ value: '3%', direction: 'up' }}
              hint="vs last week"
            />
            <StatCard
              label="AI calls handled"
              value="47"
              icon={<Bot />}
              accent="info"
              trend={{ value: '0%', direction: 'neutral' }}
              hint="steady"
            />
            <StatCard
              label="No-shows"
              value="3"
              icon={<XCircle />}
              accent="warning"
              trend={{ value: '8%', direction: 'down' }}
              hint="vs last week"
            />
          </div>
        </section>

        {/* Buttons */}
        <SectionCard title="Buttons" description="Solid indigo primary · subtle elevation">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Add">
                <Plus />
              </Button>
              <Button>
                <Phone />
                With icon
              </Button>
              <Button disabled>Disabled</Button>
              <Button disabled>
                <Spinner size="sm" className="text-primary-foreground" />
                Saving
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Badges + status */}
        <SectionCard title="Badges & status" description="Soft, tinted status pills">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="brand">Brand</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="Confirmed" />
              <StatusBadge status="Pending" />
              <StatusBadge status="Completed" />
              <StatusBadge status="Cancelled" />
              <StatusBadge status="no-show" />
              <StatusBadge status="Positive" />
              <StatusBadge status="Transferred" />
            </div>
          </div>
        </SectionCard>

        {/* Forms */}
        <SectionCard title="Form controls" description="h-10 comfortable density">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField label="Full name" htmlFor="uk-name" required>
              <Input id="uk-name" placeholder="Jane Cooper" />
            </FormField>
            <FormField
              label="Email"
              htmlFor="uk-email"
              hint="We'll send confirmations here."
            >
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="uk-email" className="pl-9" placeholder="jane@clinic.com" />
              </div>
            </FormField>
            <FormField
              label="Phone"
              htmlFor="uk-phone"
              error="Enter a valid phone number."
            >
              <Input id="uk-phone" aria-invalid defaultValue="12345" />
            </FormField>
            <FormField label="Department" htmlFor="uk-dept">
              <Select>
                <SelectTrigger id="uk-dept">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Practice</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                  <SelectItem value="cardiology">Cardiology</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Notes" htmlFor="uk-notes" className="md:col-span-2">
              <Textarea id="uk-notes" placeholder="Add any relevant details…" />
            </FormField>
            <div className="flex items-center gap-3">
              <Switch id="uk-notify" checked={notify} onCheckedChange={setNotify} />
              <Label htmlFor="uk-notify">Email notifications</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="uk-agree"
                checked={agree}
                onCheckedChange={(v) => setAgree(v === true)}
              />
              <Label htmlFor="uk-agree">I agree to the terms</Label>
            </div>
          </div>
        </SectionCard>

        {/* Alerts */}
        <SectionCard title="Alerts" description="Semantic, soft-tinted">
          <div className="space-y-3">
            <Alert variant="info">
              <Info />
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>
                Your clinic hours were updated for the holiday weekend.
              </AlertDescription>
            </Alert>
            <Alert variant="success">
              <CheckCircle2 />
              <AlertTitle>Appointment confirmed</AlertTitle>
              <AlertDescription>
                Sarah Johnson is booked for 2:30 PM today with Dr. Martinez.
              </AlertDescription>
            </Alert>
            <Alert variant="warning">
              <TriangleAlert />
              <AlertTitle>Approaching capacity</AlertTitle>
              <AlertDescription>
                Only 2 slots remain for tomorrow morning.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <XCircle />
              <AlertTitle>Sync failed</AlertTitle>
              <AlertDescription>
                We couldn&apos;t reach the calendar service. Retrying shortly.
              </AlertDescription>
            </Alert>
          </div>
        </SectionCard>

        {/* Loading states */}
        <SectionCard
          title="Loading states"
          description="Spinners and shimmer skeletons"
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex items-center gap-6">
              <Spinner size="sm" />
              <Spinner size="default" />
              <Spinner size="lg" />
              <Spinner label="Loading appointments…" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        </SectionCard>

        {/* Empty state + branded card */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Empty state</CardTitle>
              <CardDescription>Shown when a list has no items.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={<Calendar />}
                title="No appointments yet"
                description="When patients book, their appointments will appear here."
                action={
                  <Button>
                    <Plus />
                    Add appointment
                  </Button>
                }
              />
            </CardContent>
          </Card>

          {/* The single branded gradient surface — the AI card */}
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-brand-teal text-primary-foreground shadow-lg">
            <CardContent className="p-6">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <Bot className="size-5" />
              </div>
              <p className="mt-5 text-lg font-semibold">AI Receptionist</p>
              <p className="mt-1 max-w-sm text-sm text-primary-foreground/80">
                Handling calls 24/7 — booking, rescheduling, and answering
                patient questions in natural conversation.
              </p>
              <div className="mt-5 flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="bg-white/15 text-primary-foreground hover:bg-white/25"
                  onClick={() => toast.success('Demo call started')}
                >
                  <Phone />
                  Start demo call
                </Button>
                <span className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/80">
                  <Clock className="size-4" />
                  avg 42s
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
