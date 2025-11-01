import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { WebhookDetails } from '../components/webhook-details.tsx'

export const Route = createFileRoute('/webhooks/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WebhookDetails id={id} />
    </Suspense>
  )
}
