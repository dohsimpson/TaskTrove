"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DEFAULT_ROUTE } from "@/lib/constants/defaults"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to default page
    router.push(DEFAULT_ROUTE)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">TaskTrove</h1>
        <p className="text-gray-600">Redirecting to your tasks...</p>
      </div>
    </div>
  )
}
