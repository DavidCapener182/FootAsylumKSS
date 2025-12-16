'use client'

export function PrintButton() {
  return (
    <>
      <style jsx>{`
        @media print {
          .no-print {
            display: none;
          }
        }
      `}</style>
      <div className="mb-6 no-print">
        <button 
          onClick={() => window.print()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Print
        </button>
      </div>
    </>
  )
}

