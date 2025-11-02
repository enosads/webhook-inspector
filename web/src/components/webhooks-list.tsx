import * as Dialog from '@radix-ui/react-dialog'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { Loader2, Wand2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { webhookListSchema } from '../http/schemas/webhooks.ts'
import { CodeBlock } from './ui/code-block.tsx'
import { WebhooksListItem } from './webhooks-list-item.tsx'

export function WebhooksList() {
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const [checkedWebhooksIds, setCheckedWebhooksIds] = useState<string[]>([])
  const [generatedHandlerCode, setGeneratedHandlerCode] = useState<
    string | null
  >(null)

  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: ['webhooks'],
      queryFn: async ({ pageParam }) => {
        const url = new URL('http://localhost:3333/api/webhooks')
        if (pageParam) {
          url.searchParams.set('cursor', pageParam)
        }
        const response = await fetch(url)
        const data = await response.json()
        return webhookListSchema.parse(data)
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
    })

  const webhooks = data.pages.flatMap((page) => page.webhooks)

  useEffect(() => {
    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]

        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      {
        threshold: 0.1,
      },
    )
    if (loadMoreRef.current) {
      observerRef.current?.observe(loadMoreRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  function handleCheckWebhook(webhookId: string) {
    if (checkedWebhooksIds.includes(webhookId)) {
      setCheckedWebhooksIds((prevCheckedWebhooksIds) =>
        prevCheckedWebhooksIds.filter((id) => id !== webhookId),
      )
    } else {
      setCheckedWebhooksIds((prevCheckedWebhooksIds) => [
        ...prevCheckedWebhooksIds,
        webhookId,
      ])
    }
  }

  const hasAnyWebhookChecked = checkedWebhooksIds.length > 0

  async function handleGenerateHandler() {
    const response = await fetch('http://localhost:3333/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        webhookIds: checkedWebhooksIds,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    type GenerateResponse = { code: string }

    const data: GenerateResponse = await response.json()

    setGeneratedHandlerCode(data.code)

    console.log(response)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-2">
          <button
            disabled={!hasAnyWebhookChecked}
            className="bg-indigo-400 text-white size-8 disabled:opacity-50 mb-3 items-center justify-center flex w-full rounded-lg gap-3 font-medium text-sm py-2.5"
            type="button"
            onClick={() => handleGenerateHandler()}
          >
            <Wand2 className="size-4" />
            Gerar items
          </button>
          {webhooks.map((webhook) => (
            <WebhooksListItem
              key={webhook.id}
              webhook={webhook}
              onWebhookChecked={handleCheckWebhook}
              isWebhookChecked={checkedWebhooksIds.includes(webhook.id)}
            />
          ))}
        </div>
        {hasNextPage && (
          <div className="p-2" ref={loadMoreRef}>
            {isFetchingNextPage ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="size-5 animate-spin  text-zinc-500" />
              </div>
            ) : (
              'Load more'
            )}
          </div>
        )}
      </div>
      {!!generatedHandlerCode && (
        <Dialog.Root defaultOpen>
          <Dialog.Overlay className="bg-black/60 inset-0 fixed z-20" />

          <Dialog.Content className="flex items-center justify-center fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 z-40">
            <div className="bg-zinc-900 w-[600px] p-4 rounded-lg border border-zinc-800 max-h-[620px] overflow-y-auto">
              <CodeBlock language="typescript" code={generatedHandlerCode} />
            </div>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </>
  )
}
