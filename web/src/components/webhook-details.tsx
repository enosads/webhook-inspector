import { useSuspenseQuery } from '@tanstack/react-query'
import { webhookDetailSchema } from '../http/schemas/webhooks.ts'
import { SectionDataTable } from './section-data-table.tsx'
import { SectionTitle } from './section-title.tsx'
import { CodeBlock } from './ui/code-block.tsx'
import { WebhookDetailHeader } from './webhook-detail-header.tsx'

interface WebhookDetailsProps {
  id: string
}

export const WebhookDetails = ({ id }: WebhookDetailsProps) => {
  const { data } = useSuspenseQuery({
    queryKey: ['webhook', id],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3333/api/webhooks/${id}`)
      const data = await response.json()
      return webhookDetailSchema.parse(data)
    },
  })

  const overviewData = [
    { key: 'Method', value: data.method },
    { key: 'Status Code', value: '200' },
    { key: 'Content-Type', value: data.contentType || 'application/json' },
    { key: 'Content-Length', value: `${data.contentLength || 0} bytes` },
  ]

  const headers = Object.entries(data.headers).map(([key, value]) => ({
    key,
    value: Array.isArray(value) ? value.join(', ') : value,
  }))

  const queryParams = Object.entries(data.queryParams || {}).map(
    ([key, value]) => ({
      key,
      value: Array.isArray(value) ? value.join(', ') : value,
    }),
  )

  return (
    <div className="flex h-full flex-col">
      <WebhookDetailHeader
        method={data.method}
        ip={data.ip}
        createdAt={data.createdAt}
        pathname={data.pathname}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          <div className="space-y-4">
            <SectionTitle>Request Overview</SectionTitle>
            <SectionDataTable data={overviewData} />
          </div>
          <div className="space-y-4">
            <SectionTitle>Headers</SectionTitle>
            <SectionDataTable data={headers} />
          </div>
          {queryParams.length > 0 && (
            <div className="space-y-4">
              <SectionTitle>Query Parameters</SectionTitle>
              <SectionDataTable data={queryParams} />
            </div>
          )}
          {data.body && (
            <div className="space-y-4">
              <SectionTitle>Request Body</SectionTitle>
              <CodeBlock code={data.body} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
