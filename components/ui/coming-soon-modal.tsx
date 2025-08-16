"use client"

import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MailIcon } from "@/components/ui/custom/animated-icons"

interface ComingSoonModalProps {
  isOpen: boolean
  onClose: () => void
  featureName: string
}

export function ComingSoonModal({ isOpen, onClose, featureName }: ComingSoonModalProps) {
  const handleSignUp = () => {
    window.open("https://mailing.tasktrove.io/", "_blank", "noopener,noreferrer")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background to-muted/30">
        <DialogHeader className="sr-only">
          <DialogTitle>{featureName} is coming soon</DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-6 pt-2">
          <MailIcon size={48} className="text-orange-300" />

          {/* Heading and description */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              <span className="relative">
                <span
                  className="relative z-10"
                  style={{ animation: "wiggleCook 2s ease-in-out infinite" }}
                >
                  {featureName}
                </span>
                <svg
                  className="absolute -bottom-1 left-0 h-2 text-primary/70"
                  style={{
                    width: "100%",
                  }}
                  viewBox="0 0 100 8"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 6 Q25 2 50 6 T100 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </span>{" "}
              is cooking!
            </h2>
            <style>{`
              @keyframes wiggleCook {
                0%,
                100% {
                  transform: rotate(0deg) scale(1);
                }
                25% {
                  transform: rotate(-1deg) scale(1.02);
                }
                75% {
                  transform: rotate(1deg) scale(0.98);
                }
              }
              @keyframes squiggle {
                0%,
                100% {
                  transform: scaleX(1) translateY(0px);
                  opacity: 0.4;
                }
                50% {
                  transform: scaleX(1.1) translateY(-1px);
                  opacity: 0.6;
                }
              }
            `}</style>
            <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed pt-2">
              We're working hard on this feature.
              <br />
              Join our mailing list to get news and updates about TaskTrove!
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleSignUp}
              className="w-full h-11 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
            >
              <Mail className="mr-2 h-4 w-4" />
              Subscribe to Mailing List
            </Button>

            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full text-muted-foreground hover:bg-transparent dark:hover:bg-transparent cursor-pointer"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
