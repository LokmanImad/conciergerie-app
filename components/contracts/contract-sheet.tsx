import type { OwnerContract } from "@/features/contracts/types"
import { renderContractContent } from "@/features/contracts/types"

export function ContractSheet({ contract }: { contract: OwnerContract }) {
  const content = renderContractContent(contract)
  return (
    <article className="mx-auto min-h-[297mm] max-w-[210mm] bg-white px-[18mm] py-[16mm] text-slate-950 shadow-sm print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
      <header className="mb-8 border-b-2 border-slate-900 pb-5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">{contract.contract_number}</p>
        <h1 className="mt-2 text-2xl font-bold">{contract.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{contract.apartment?.name} · Commission {Number(contract.commission_rate).toFixed(2)} %</p>
      </header>
      <div className="space-y-3 text-[13px] leading-6">
        {content.split("\n").map((line, index) => {
          const value = line.trim()
          if (!value) return <div key={index} className="h-2" />
          if (value.startsWith("ARTICLE ")) return <h2 key={index} className="break-after-avoid pt-3 text-sm font-bold uppercase">{value}</h2>
          if (value === value.toUpperCase() && value.length < 80) return <h2 key={index} className="break-after-avoid text-center text-sm font-bold">{value}</h2>
          return <p key={index} className="whitespace-pre-wrap text-justify">{line}</p>
        })}
      </div>
      <footer className="mt-10 border-t pt-4 text-[10px] text-slate-500">
        Contrat {contract.contract_number} · établi le {formatDate(contract.start_date)}
      </footer>
    </article>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(`${value}T12:00:00`))
}
