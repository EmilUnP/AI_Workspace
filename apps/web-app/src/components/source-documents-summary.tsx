type SourceDoc = { id?: string; title: string }

type SourceDocumentsSummaryProps = {
  documents: SourceDoc[]
  label?: string
  className?: string
}

export function SourceDocumentsSummary({
  documents,
  label = 'Source documents',
  className = '',
}: SourceDocumentsSummaryProps) {
  if (!documents.length) return null

  return (
    <div className={`text-sm text-gray-600 ${className}`.trim()}>
      <p className="font-medium text-gray-700">
        {label}{' '}
        <span className="font-normal text-gray-500">({documents.length})</span>
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {documents.map((doc, index) => (
          <li
            key={doc.id || `${doc.title}-${index}`}
            className="max-w-full truncate rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700"
            title={doc.title}
          >
            {doc.title}
          </li>
        ))}
      </ul>
    </div>
  )
}
