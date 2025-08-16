"use client"

import { AnimatedIcons } from "./animated-icons"

/**
 * Showcase component displaying all available animated icons
 * Perfect for testing and choosing icons for your UI
 */
export function AnimatedIconsShowcase() {
  const iconData = [
    { component: AnimatedIcons.Rocket, name: "Rocket", description: "Launch & excitement" },
    {
      component: AnimatedIcons.MultiSparkles,
      name: "Multi Sparkles",
      description: "Magic & wonder",
    },
    { component: AnimatedIcons.ChefHat, name: "Chef Hat", description: "Cooking & creation" },
    { component: AnimatedIcons.Timer, name: "Timer", description: "Time & progress" },
    { component: AnimatedIcons.Gift, name: "Gift", description: "Surprises & rewards" },
    { component: AnimatedIcons.Hourglass, name: "Hourglass", description: "Waiting & patience" },
    { component: AnimatedIcons.Calendar, name: "Calendar", description: "Events & scheduling" },
    { component: AnimatedIcons.Package, name: "Package", description: "Delivery & shipping" },
    { component: AnimatedIcons.Lightbulb, name: "Lightbulb", description: "Ideas & innovation" },
    { component: AnimatedIcons.Gear, name: "Gear", description: "Settings & configuration" },
    { component: AnimatedIcons.Target, name: "Target", description: "Goals & objectives" },
    { component: AnimatedIcons.Check, name: "Check", description: "Success & completion" },
    { component: AnimatedIcons.Bell, name: "Bell", description: "Notifications & alerts" },
    { component: AnimatedIcons.Mail, name: "Mail", description: "Email & communication" },
    { component: AnimatedIcons.Search, name: "Search", description: "Discovery & exploration" },
    {
      component: AnimatedIcons.GenesisAdd,
      name: "Genesis Add",
      description: "Creation burst effect",
    },
    {
      component: AnimatedIcons.ComplexSparkles,
      name: "Complex Sparkles",
      description: "Multi-particle animation",
    },
  ]

  return (
    <div className="p-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Animated Icons Showcase</h1>
          <p className="text-muted-foreground">
            A collection of beautifully animated Lucide icons for TaskTrove
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {iconData.map((icon) => {
            const IconComponent = icon.component
            return (
              <div
                key={icon.name}
                className="flex flex-col items-center space-y-3 p-4 rounded-lg border bg-card hover:bg-card/80 transition-colors"
              >
                {/* Icon Container */}
                <div className="flex h-16 w-16 items-center justify-center">
                  <IconComponent size={24} />
                </div>

                {/* Icon Info */}
                <div className="text-center space-y-1">
                  <h3 className="font-medium text-sm text-foreground">{icon.name}</h3>
                  <p className="text-xs text-muted-foreground leading-tight">{icon.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-12 p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Usage</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Import individual icons:</h3>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                {`import { RocketIcon, MailIcon, GenesisAddIcon } from "@/components/ui/custom/animated-icons"`}
              </pre>
            </div>
            <div>
              <h3 className="font-medium mb-2">Or import the collection:</h3>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                {`import { AnimatedIcons } from "@/components/ui/custom/animated-icons"

// Usage: <AnimatedIcons.Rocket size={32} className="text-blue-500" />`}
              </pre>
            </div>
            <div>
              <h3 className="font-medium mb-2">Props:</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>
                  <code>size?: number</code> - Icon size in pixels (default: 24)
                </li>
                <li>
                  <code>className?: string</code> - Custom CSS classes (default: "text-primary")
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
