'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Sparkles, FileSpreadsheet, ChevronRight, BarChart3, PieChart } from 'lucide-react'

// --- REAL IMPORTS (Uncomment these in your project) ---
// import { requireAuth } from '@/lib/auth'

// --- MOCK AUTH FOR PREVIEW (Delete this in production) ---
const requireAuth = async () => {};
// -----------------------------------------------------------

// --- UI COMPONENTS (Mocked for single-file preview if needed, or use real shadcn) ---
// Assuming you have these components, but I'll use standard Tailwind for the preview logic if specific shadcn logic is missing.
// I will use standard HTML elements styled to look like your components for maximum stability in this preview.

export default function ReportsPage() {
  // useEffect(() => { requireAuth(); }, []); // Simulate auth check

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8 bg-slate-50/50 min-h-screen">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-sm flex-shrink-0">
                <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports & Exports</h1>
          </div>
          <p className="text-sm sm:text-base text-slate-500 max-w-2xl ml-9 sm:ml-11">
            Download detailed compliance data or generate AI-powered insights for your team.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Incidents Report Card */}
        <Card className="group relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border-slate-200 bg-white">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    <AlertIcon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">CSV</span>
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">Incidents Data</CardTitle>
            <CardDescription className="text-slate-500">
              Full export of all reported incidents, including status, severity, and resolution details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/reports/incidents" method="GET">
              <Button type="submit" className="w-full bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-700 transition-all font-semibold shadow-sm min-h-[44px]">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Actions Report Card */}
        <Card className="group relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border-slate-200 bg-white">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-4">
             <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                    <ChecklistIcon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">CSV</span>
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">Actions Log</CardTitle>
            <CardDescription className="text-slate-500">
              Comprehensive list of corrective actions, assigned owners, due dates, and completion status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/reports/actions" method="GET">
              <Button type="submit" className="w-full bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-purple-200 hover:text-purple-700 transition-all font-semibold shadow-sm min-h-[44px]">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </form>
          </CardContent>
        </Card>

         {/* Store Audit Summary (New Addition) */}
         <Card className="group relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border-slate-200 bg-white">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-4">
             <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                    <StoreIcon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">PDF</span>
            </div>
            <CardTitle className="text-lg font-bold text-slate-900">Store Audit Summary</CardTitle>
            <CardDescription className="text-slate-500">
              High-level summary of audit scores across all regions for the current fiscal quarter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/reports/audit-summary" method="GET">
              <Button type="submit" className="w-full bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-emerald-200 hover:text-emerald-700 transition-all font-semibold shadow-sm min-h-[44px]">
                <Download className="h-4 w-4 mr-2" />
                Download Summary
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* AI Analysis Card (Full Width on mobile, spanned on large) */}
        <Card className="md:col-span-2 lg:col-span-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
                 <Sparkles className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-indigo-900">AI Compliance Intelligence</CardTitle>
            </div>
            <CardDescription className="text-indigo-600/80">
              Generate an on-demand executive summary using our advanced AI analysis engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
            <div className="space-y-2 max-w-2xl w-full">
                <div className="flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm text-indigo-800/70">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
                        <span>Trend Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <PieChart className="h-3 w-3 md:h-4 md:w-4" />
                        <span>Risk Distribution</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 md:h-4 md:w-4" />
                        <span>Executive Summary</span>
                    </div>
                </div>
                <p className="text-xs md:text-sm text-indigo-900/60 leading-relaxed">
                The AI Compliance Report analyzes your live dashboard data to identify patterns, highlight top risks, and provide strategic recommendations for your management team. This report is generated dynamically on the Dashboard.
                </p>
            </div>
            
            <Button asChild className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-0 w-full md:w-auto min-h-[44px] md:min-h-0">
              <a href="/dashboard" className="flex items-center justify-center">
                <span className="hidden sm:inline">Go to Dashboard Analysis</span>
                <span className="sm:hidden">Dashboard Analysis</span>
                <ChevronRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Icons for the cards (using Lucide)
function AlertIcon(props: any) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        </svg>
    )
}

function ChecklistIcon(props: any) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <rect width="20" height="20" x="2" y="2" rx="2" />
        <path d="m9 12 2 2 4-4" />
        </svg>
    )
}

function StoreIcon(props: any) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
        <path d="M2 7h20" />
        <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
        </svg>
    )
}