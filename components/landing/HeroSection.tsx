import React from "react";
import { BarChart3, Users, Timer } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative w-full px-4 py-16 md:py-24">
      <div className="mx-auto max-w-[1120px]">
        {/* Hero Text */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
            <span className="text-xs font-medium text-emerald-700">AI-powered analytics</span>
          </div>
          <h1 className="mb-4 text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
            Transform Your Data Into
            <br />
            Actionable Insights
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
            Insightseel helps teams make data-driven decisions with AI-powered analytics.
            Upload your data, get instant insights, and watch your business grow.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-emerald-700">
              Try insightseel
            </button>
            <p className="text-xs text-slate-500">No credit card needed</p>
          </div>
        </div>

        {/* Product Preview Window */}
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            {/* Window Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="text-sm font-medium text-slate-800">Dashboard Overview</h3>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50">
                  Last 7 days
                </button>
                <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50">
                  Export
                </button>
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="grid gap-4 p-6 md:grid-cols-3">
              {/* Metric Card 1 */}
              <div className="flex h-[120px] flex-col justify-between rounded-2xl border border-slate-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Users className="h-5 w-5" />
                    <span className="text-xs font-medium">Active Users</span>
                  </div>
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-slate-900">8,432</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">+4.3% vs last week</p>
                </div>
              </div>

              {/* Metric Card 2 */}
              <div className="flex h-[120px] flex-col justify-between rounded-2xl border border-slate-200 bg-lime-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-lime-700">
                    <Timer className="h-5 w-5" />
                    <span className="text-xs font-medium">Avg. Session</span>
                  </div>
                  <BarChart3 className="h-4 w-4 text-lime-500" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-slate-900">12m 34s</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">+2.1% vs last week</p>
                </div>
              </div>

              {/* Metric Card 3 */}
              <div className="flex h-[120px] flex-col justify-between rounded-2xl border border-slate-200 bg-teal-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-700">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-xs font-medium">Conversion</span>
                  </div>
                  <BarChart3 className="h-4 w-4 text-teal-500" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-slate-900">24.8%</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">+1.2% vs last week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
