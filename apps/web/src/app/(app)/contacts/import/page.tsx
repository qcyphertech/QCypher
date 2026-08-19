import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, History } from 'lucide-react'
import { ImportWizard } from '@/components/contacts/ImportWizard'
import { ImportHistory } from '@/components/contacts/ImportHistory'
import { listImports } from '@/lib/actions/imports'

export const metadata: Metadata = { title: 'Import Contacts' }

export default async function ImportPage() {
  const imports = await listImports()

  return (
    <div className="max-w-[52.5rem] mx-auto space-y-8">
      <div>
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1.5 text-sm mb-4"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          <ArrowLeft size={14} /> Back to Contacts
        </Link>
        <h1 className="text-2xl font-black" style={{ color: 'var(--heading)' }}>
          Import Contacts
        </h1>
        <p className="text-[15px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Upload a CSV file to bring in your existing contacts.
        </p>
      </div>

      <ImportWizard />

      {imports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2"
            style={{ color: 'hsl(var(--muted-foreground))' }}>
            <History size={14} /> Import History
          </h2>
          <ImportHistory imports={imports} />
        </div>
      )}
    </div>
  )
}
