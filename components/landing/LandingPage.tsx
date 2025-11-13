import React from "react";
import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import ScrollDragSection from "./ScrollDragSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-slate-50">
      <Navbar />
      <HeroSection />
      <ScrollDragSection />
    </div>
  );
}
